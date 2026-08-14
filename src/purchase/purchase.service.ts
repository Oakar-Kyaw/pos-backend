import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PurchaseStatus } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';

@Injectable()
export class PurchaseService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // CREATE
  // ============================================================

  async create(
    dto: CreatePurchaseDto,
    userId: number,
    companyId: number,
    branchId?: number,
  ) {
    try {
      const purchase = await this.prisma.$transaction(async (tx) => {
        // ------------------------------------------------------
        // Validate supplier
        // ------------------------------------------------------

        const supplier = await tx.supplier.findFirst({
          where: {
            id: dto.supplierId,
            companyId,
            isDeleted: false,
          },
        });

        if (!supplier) {
          throw new NotFoundException(`Supplier ${dto.supplierId} not found`);
        }

        // ------------------------------------------------------
        // Validate request items
        // ------------------------------------------------------

        // for (const item of dto.requestItems ?? []) {
        //   if (item.productId == null) {
        //     throw new ForbiddenException(
        //       'Product ID is required for request item',
        //     );
        //   }

        //   const product = await tx.product.findFirst({
        //     where: {
        //       id: item.productId,
        //       companyId,
        //       isDeleted: false,
        //     },
        //   });

        //   if (!product) {
        //     throw new NotFoundException(`Product ${item.productId} not found`);
        //   }
        // }

        // ------------------------------------------------------
        // Validate purchase items
        // ------------------------------------------------------

        for (const item of dto.purchaseItems ?? []) {
          if (item.productId == null) {
            throw new ForbiddenException(
              'Product ID is required for purchase item',
            );
          }

          const product = await tx.product.findFirst({
            where: {
              id: item.productId,
              companyId,
              isDeleted: false,
            },
          });

          if (!product) {
            throw new NotFoundException(`Product ${item.productId} not found`);
          }
        }

        // ------------------------------------------------------
        // Calculate subtotal
        // ------------------------------------------------------

        const subtotal = (dto.purchaseItems ?? []).reduce((sum, item) => {
          const price = new Prisma.Decimal(item.price);
          const quantity = new Prisma.Decimal(item.quantity);

          return sum.plus(price.mul(quantity));
        }, new Prisma.Decimal(0));

        // ------------------------------------------------------
        // Purchase costs
        // ------------------------------------------------------

        const deliveryFee = new Prisma.Decimal(dto.deliveryFee ?? 0);

        const discount = new Prisma.Decimal(dto.discount ?? 0);

        const tax = new Prisma.Decimal(dto.tax ?? 0);

        // ------------------------------------------------------
        // Final total
        //
        // total = subtotal + deliveryFee + tax - discount
        // ------------------------------------------------------

        const total = subtotal.plus(deliveryFee).plus(tax).minus(discount);

        // Prevent negative total
        if (total.lessThan(0)) {
          throw new ForbiddenException(
            'Discount cannot be greater than the purchase amount',
          );
        }

        // ------------------------------------------------------
        // Create purchase
        // ------------------------------------------------------

        const created = await tx.purchase.create({
          data: {
            orderDate: dto.orderDate,

            ...(dto.receivedDate !== undefined && {
              receivedDate: dto.receivedDate,
            }),

            status: dto.status ?? PurchaseStatus.PENDING,

            supplierId: dto.supplierId,
            companyId,
            branchId,

            note: dto.note,

            deliveryFee,
            discount,
            tax,

            // requestItems: {
            //   create: (dto.requestItems ?? []).map((item) => ({
            //     product: {
            //       connect: {
            //         id: item.productId!,
            //       },
            //     },

            //     quantity: item.quantity,

            //     price: new Prisma.Decimal(item.price),

            //     costPrice: new Prisma.Decimal(item.costPrice),
            //   })),
            // },

            purchaseItems: {
              create: (dto.purchaseItems ?? []).map((item) => ({
                product: {
                  connect: {
                    id: item.productId!,
                  },
                },

                quantity: item.quantity,

                price: new Prisma.Decimal(item.price),

                costPrice: new Prisma.Decimal(item.costPrice),
              })),
            },
          },

          include: {
            supplier: true,

            purchaseItems: {
              include: {
                product: true,
              },
            },
          },
        });

        // ------------------------------------------------------
        // Update product stock
        // ------------------------------------------------------
        //
        // Current behavior:
        // Purchase items immediately increase stock.
        //
        // If later you want stock to increase ONLY when status
        // becomes RECEIVED, this logic should be moved to the
        // RECEIVED status transition.
        // ------------------------------------------------------

        for (const item of dto.purchaseItems ?? []) {
          if (item.productId == null) {
            continue;
          }

          await tx.product.update({
            where: {
              id: item.productId,
            },

            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        }

        return {
          created,
          subtotal,
          deliveryFee,
          discount,
          tax,
          total,
        };
      });

      return {
        success: true,
        message: 'Purchase created successfully',

        data: purchase.created,

        meta: {
          subtotal: purchase.subtotal.toString(),
          deliveryFee: purchase.deliveryFee.toString(),
          discount: purchase.discount.toString(),
          tax: purchase.tax.toString(),
          total: purchase.total.toString(),
        },
      };
    } catch (error) {
      console.error('Purchase create error:', error);

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new ForbiddenException('Unable to create purchase');
    }
  }

  // ============================================================
  // FIND ALL
  // ============================================================

  async findAll(
    userId: number,
    companyId: number,
    branchId: number,
    page = 1,
    limit = 10,
    search?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseWhereInput = {
      companyId,

      isDeleted: false,

      ...(branchId !== undefined && {
        branchId,
      }),

      ...(search?.trim() && {
        OR: [
          {
            note: {
              contains: search.trim(),
              mode: 'insensitive',
            },
          },

          {
            supplier: {
              email: {
                contains: search.trim(),
                mode: 'insensitive',
              },
            },
          },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.purchase.findMany({
        where,

        include: {
          supplier: true,

          purchaseItems: {
            include: {
              product: true,
            },
          },
        },

        orderBy: {
          id: 'desc',
        },

        skip,
        take: limit,
      }),

      this.prisma.purchase.count({
        where,
      }),
    ]);

    return {
      success: true,
      message: 'Purchases fetched successfully',

      data,

      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================================
  // FIND ONE
  // ============================================================

  async findOne(
    id: number,
    userId: number,
    companyId: number,
    branchId?: number,
  ) {
    const purchase = await this.prisma.purchase.findFirst({
      where: {
        id,

        companyId,

        isDeleted: false,

        ...(branchId !== undefined && {
          branchId,
        }),
      },

      include: {
        supplier: true,
        purchaseItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!purchase) {
      throw new NotFoundException({
        success: false,
        message: 'Purchase not found',
        data: null,
      });
    }

    // ----------------------------------------------------------
    // Calculate purchase totals
    // ----------------------------------------------------------

    const subtotal = purchase.purchaseItems.reduce((sum, item) => {
      const price = new Prisma.Decimal(item.price);
      const quantity = new Prisma.Decimal(item.quantity);

      return sum.plus(price.mul(quantity));
    }, new Prisma.Decimal(0));

    const deliveryFee = new Prisma.Decimal(purchase.deliveryFee ?? 0);

    const discount = new Prisma.Decimal(purchase.discount ?? 0);

    const tax = new Prisma.Decimal(purchase.tax ?? 0);

    const total = subtotal.plus(deliveryFee).plus(tax).minus(discount);

    return {
      success: true,
      message: 'Purchase fetched successfully',

      data: {
        ...purchase,

        totals: {
          subtotal: subtotal.toString(),
          deliveryFee: deliveryFee.toString(),
          discount: discount.toString(),
          tax: tax.toString(),
          total: total.toString(),
        },
      },
    };
  }

  // ============================================================
  // UPDATE
  // ============================================================

  async update(
    id: number,
    dto: UpdatePurchaseDto,
    userId: number,
    companyId: number,
    branchId?: number,
  ) {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // ----------------------------------------------------
        // Get existing purchase
        // ----------------------------------------------------

        const existingPurchase = await tx.purchase.findFirst({
          where: {
            id,

            companyId,

            isDeleted: false,

            ...(branchId !== undefined && {
              branchId,
            }),
          },

          include: {
            purchaseItems: true,
          },
        });

        if (!existingPurchase) {
          throw new NotFoundException('Purchase not found');
        }

        // ----------------------------------------------------
        // Validate supplier
        // ----------------------------------------------------

        if (dto.supplierId !== undefined) {
          const supplier = await tx.supplier.findFirst({
            where: {
              id: dto.supplierId,
              companyId,
              isDeleted: false,
            },
          });

          if (!supplier) {
            throw new NotFoundException(`Supplier ${dto.supplierId} not found`);
          }
        }

        // ----------------------------------------------------
        // Validate request items
        // ----------------------------------------------------

        // if (dto.requestItems !== undefined) {
        //   for (const item of dto.requestItems) {
        //     if (item.productId == null) {
        //       throw new ForbiddenException(
        //         'Product ID is required for request item',
        //       );
        //     }

        //     const product = await tx.product.findFirst({
        //       where: {
        //         id: item.productId,
        //         companyId,
        //         isDeleted: false,
        //       },
        //     });

        //     if (!product) {
        //       throw new NotFoundException(
        //         `Product ${item.productId} not found`,
        //       );
        //     }
        //   }
        // }

        // ----------------------------------------------------
        // Validate purchase items
        // ----------------------------------------------------

        if (dto.purchaseItems !== undefined) {
          for (const item of dto.purchaseItems) {
            if (item.productId == null) {
              throw new ForbiddenException(
                'Product ID is required for purchase item',
              );
            }

            const product = await tx.product.findFirst({
              where: {
                id: item.productId,
                companyId,
                isDeleted: false,
              },
            });

            if (!product) {
              throw new NotFoundException(
                `Product ${item.productId} not found`,
              );
            }
          }
        }

        // ----------------------------------------------------
        // Update stock when purchase items change
        // ----------------------------------------------------

        if (dto.purchaseItems !== undefined) {
          const oldStockMap = new Map<number, number>();
          const newStockMap = new Map<number, number>();

          // -----------------------------------------------
          // Old quantities
          // -----------------------------------------------

          for (const item of existingPurchase.purchaseItems) {
            if (item.productId == null) {
              continue;
            }

            oldStockMap.set(
              item.productId,
              (oldStockMap.get(item.productId) ?? 0) + item.quantity,
            );
          }

          // -----------------------------------------------
          // New quantities
          // -----------------------------------------------

          for (const item of dto.purchaseItems) {
            if (item.productId == null) {
              continue;
            }

            newStockMap.set(
              item.productId,
              (newStockMap.get(item.productId) ?? 0) + item.quantity,
            );
          }

          // -----------------------------------------------
          // Find affected products
          // -----------------------------------------------

          const productIds = new Set<number>([
            ...oldStockMap.keys(),
            ...newStockMap.keys(),
          ]);

          // -----------------------------------------------
          // Apply stock difference
          // -----------------------------------------------

          for (const productId of productIds) {
            const oldQuantity = oldStockMap.get(productId) ?? 0;

            const newQuantity = newStockMap.get(productId) ?? 0;

            const difference = newQuantity - oldQuantity;

            if (difference === 0) {
              continue;
            }

            await tx.product.update({
              where: {
                id: productId,
              },

              data: {
                stock: {
                  increment: difference,
                },
              },
            });
          }

          // -----------------------------------------------
          // Delete old purchase items
          // -----------------------------------------------

          await tx.purchaseItem.deleteMany({
            where: {
              purchaseId: id,
            },
          });

          // -----------------------------------------------
          // Create new purchase items
          // -----------------------------------------------
          await tx.purchaseItem.createMany({
            data: dto.purchaseItems.map((item) => ({
              purchaseId: id,

              productId: item.productId!,

              quantity: item.quantity,

              price: new Prisma.Decimal(item.price),

              costPrice: new Prisma.Decimal(item.costPrice),
            })),
          });
        }

        // ----------------------------------------------------
        // Update request items
        // ----------------------------------------------------

        // if (dto.requestItems !== undefined) {
        //   await tx.requestItem.deleteMany({
        //     where: {
        //       purchaseId: id,
        //     },
        //   });

        // await tx.requestItem.createMany({
        //   data: dto.requestItems.map((item) => ({
        //     purchaseId: id,

        //     productId: item.productId!,

        //     quantity: item.quantity,

        //     price: new Prisma.Decimal(item.price),

        //     costPrice: new Prisma.Decimal(item.costPrice),
        //   })),
        // });
        // }

        // ----------------------------------------------------
        // Update purchase
        // ----------------------------------------------------

        const updated = await tx.purchase.update({
          where: {
            id,
          },

          data: {
            ...(dto.orderDate !== undefined && {
              orderDate: dto.orderDate,
            }),

            ...(dto.receivedDate !== undefined && {
              receivedDate: dto.receivedDate,
            }),

            ...(dto.status !== undefined && {
              status: dto.status,
            }),

            ...(dto.supplierId !== undefined && {
              supplierId: dto.supplierId,
            }),

            ...(dto.note !== undefined && {
              note: dto.note,
            }),

            ...(dto.deliveryFee !== undefined && {
              deliveryFee: new Prisma.Decimal(dto.deliveryFee),
            }),

            ...(dto.discount !== undefined && {
              discount: new Prisma.Decimal(dto.discount),
            }),

            ...(dto.tax !== undefined && {
              tax: new Prisma.Decimal(dto.tax),
            }),
          },

          include: {
            supplier: true,
            purchaseItems: {
              include: {
                product: true,
              },
            },
          },
        });

        // ----------------------------------------------------
        // Calculate updated totals
        // ----------------------------------------------------

        const subtotal = updated.purchaseItems.reduce((sum, item) => {
          const price = new Prisma.Decimal(item.price);

          const quantity = new Prisma.Decimal(item.quantity);

          return sum.plus(price.mul(quantity));
        }, new Prisma.Decimal(0));

        const deliveryFee = new Prisma.Decimal(updated.deliveryFee ?? 0);

        const discount = new Prisma.Decimal(updated.discount ?? 0);

        const tax = new Prisma.Decimal(updated.tax ?? 0);

        const total = subtotal.plus(deliveryFee).plus(tax).minus(discount);

        if (total.lessThan(0)) {
          throw new ForbiddenException(
            'Discount cannot be greater than the purchase amount',
          );
        }

        return {
          updated,
          subtotal,
          deliveryFee,
          discount,
          tax,
          total,
        };
      });

      return {
        success: true,
        message: 'Purchase updated successfully',

        data: result.updated,

        meta: {
          subtotal: result.subtotal.toString(),
          deliveryFee: result.deliveryFee.toString(),
          discount: result.discount.toString(),
          tax: result.tax.toString(),
          total: result.total.toString(),
        },
      };
    } catch (error) {
      console.error('Purchase update error:', error);

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new ForbiddenException('Unable to update purchase');
    }
  }

  // ============================================================
  // DELETE / SOFT DELETE
  // ============================================================

  async remove(
    id: number,
    userId: number,
    companyId: number,
    branchId?: number,
  ) {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // ----------------------------------------------------
        // Find purchase
        // ----------------------------------------------------

        const purchase = await tx.purchase.findFirst({
          where: {
            id,

            companyId,

            isDeleted: false,

            ...(branchId !== undefined && {
              branchId,
            }),
          },

          include: {
            purchaseItems: true,
          },
        });

        if (!purchase) {
          throw new NotFoundException('Purchase not found');
        }

        // ----------------------------------------------------
        // Roll back stock
        // ----------------------------------------------------

        const stockMap = new Map<number, number>();

        for (const item of purchase.purchaseItems) {
          if (item.productId == null) {
            continue;
          }

          stockMap.set(
            item.productId,
            (stockMap.get(item.productId) ?? 0) + item.quantity,
          );
        }

        for (const [productId, quantity] of stockMap.entries()) {
          await tx.product.update({
            where: {
              id: productId,
            },

            data: {
              stock: {
                decrement: quantity,
              },
            },
          });
        }

        // ----------------------------------------------------
        // Soft delete purchase
        // ----------------------------------------------------

        const deleted = await tx.purchase.update({
          where: {
            id,
          },

          data: {
            isDeleted: true,
          },
        });

        return deleted;
      });

      return {
        success: true,
        message: 'Purchase deleted successfully',
        data: result,
      };
    } catch (error) {
      console.error('Purchase delete error:', error);

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new ForbiddenException('Unable to delete purchase');
    }
  }
}
