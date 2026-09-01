import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, PurchaseStatus } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { CreatePurchasePaymentDto } from './dto/purchase-payment.dto';

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
      const result = await this.prisma.$transaction(async (tx) => {
        // ========================================================
        // CHECK SUPPLIER
        // ========================================================

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

        // ========================================================
        // CHECK PRODUCTS
        // ========================================================

        await this.checkPurchaseItems(tx, dto.purchaseItems ?? [], companyId);

        // ========================================================
        // CHECK PAYMENTS
        // ========================================================

        await this.checkPaymentData(tx, dto.purchasePayment ?? []);

        // ========================================================
        // CALCULATE SUBTOTAL
        // ========================================================

        const subtotal = this.calculateItemTotal(dto.purchaseItems ?? []);

        // ========================================================
        // COSTS
        // ========================================================

        const deliveryFee = new Prisma.Decimal(dto.deliveryFee ?? 0);

        const packagingFee = new Prisma.Decimal(dto.packagingFee ?? 0);

        const discount = new Prisma.Decimal(dto.discount ?? 0);

        const discountPercent = new Prisma.Decimal(dto.discountPercent ?? 0);

        const tax = new Prisma.Decimal(dto.tax ?? 0);

        // ========================================================
        // CALCULATE TOTAL
        // ========================================================

        const beforePercentageDiscount = subtotal
          .plus(deliveryFee)
          .plus(packagingFee)
          .plus(tax)
          .minus(discount);

        if (beforePercentageDiscount.lessThan(0)) {
          throw new BadRequestException(
            'Discount cannot be greater than the purchase amount',
          );
        }

        const percentageDiscount = beforePercentageDiscount
          .mul(discountPercent)
          .div(100);

        const total = beforePercentageDiscount.minus(percentageDiscount);

        if (total.lessThan(0)) {
          throw new BadRequestException(
            'Discount cannot be greater than the purchase amount',
          );
        }

        // ========================================================
        // CALCULATE PAYMENT TOTAL
        // ========================================================

        const paymentTotal = this.calculatePaymentAmount(
          dto.purchasePayment ?? [],
        );

        // ========================================================
        // CHECK PAYMENT == TOTAL
        // ========================================================

        if (!total.equals(paymentTotal)) {
          throw new BadRequestException(
            `Purchase amount mismatch. Purchase total: ${total.toString()}, Payment total: ${paymentTotal.toString()}`,
          );
        }

        // ========================================================
        // CREATE PURCHASE
        // ========================================================

        const created = await tx.purchase.create({
          data: {
            orderDate: dto.orderDate,

            ...(dto.receivedDate !== undefined && {
              receivedDate: dto.receivedDate,
            }),

            status: dto.status ?? PurchaseStatus.PENDING,

            supplierId: dto.supplierId,

            companyId,

            ...(branchId !== undefined && {
              branchId,
            }),

            ...(dto.note !== undefined && {
              note: dto.note,
            }),

            createdBy: userId,

            deliveryFee,
            packagingFee,
            discount,
            discountPercent,
            tax,
            totalAmount: total,

            purchaseItems: {
              create: (dto.purchaseItems ?? []).map((item) => ({
                productId: item.productId!,
                quantity: item.quantity,
                price: new Prisma.Decimal(item.price),
              })),
            },

            purchasePayments: {
              create: (dto.purchasePayment ?? []).map((payment) => ({
                paymentData: {
                  connect: {
                    id: payment.paymentDataId,
                  },
                },

                amount: new Prisma.Decimal(payment.amount),

                type: payment.type,
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

            purchasePayments: {
              include: {
                paymentData: true,
              },
            },
          },
        });

        return {
          created,
          subtotal,
          deliveryFee,
          packagingFee,
          discount,
          discountPercent,
          tax,
          total,
          paymentTotal,
        };
      });

      return {
        success: true,
        message: 'Purchase created successfully',

        data: result.created,

        meta: {
          subtotal: result.subtotal.toString(),
          deliveryFee: result.deliveryFee.toString(),
          packagingFee: result.packagingFee.toString(),
          discount: result.discount.toString(),
          discountPercent: result.discountPercent.toString(),
          tax: result.tax.toString(),
          total: result.total.toString(),
          paymentTotal: result.paymentTotal.toString(),
        },
      };
    } catch (error) {
      console.error('Purchase create error:', error);

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new ForbiddenException('Unable to create purchase');
    }
  }

  // ============================================================
  // FIND ALL
  // ============================================================

  async findAll(companyId: number, branchId: number, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseWhereInput = {
      companyId,
      isDeleted: false,

      ...(branchId !== undefined && {
        branchId,
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

          purchasePayments: {
            include: {
              paymentData: true,
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
  // FIND BY FILTER
  // ============================================================

  async findByFilter(
    companyId: number,
    branchId: number,
    page = 1,
    limit = 20,
    search?: string,
    supplierId?: number,
    startDate?: Date,
    endDate?: Date,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseWhereInput = {
      companyId,
      isDeleted: false,

      ...(branchId !== undefined && {
        branchId,
      }),

      ...(supplierId !== undefined && {
        supplierId,
      }),

      ...(startDate &&
        endDate && {
          orderDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
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

          purchasePayments: {
            include: {
              paymentData: true,
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
      message: 'Purchases by filter fetched successfully',

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

        purchasePayments: {
          include: {
            paymentData: true,
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

    const subtotal = this.calculateItemTotal(
      purchase.purchaseItems.map((item) => ({
        price: Number(item.price),
        quantity: item.quantity,
      })),
    );

    const deliveryFee = new Prisma.Decimal(purchase.deliveryFee ?? 0);

    const packagingFee = new Prisma.Decimal(purchase.packagingFee ?? 0);

    const discount = new Prisma.Decimal(purchase.discount ?? 0);

    const discountPercent = new Prisma.Decimal(purchase.discountPercent ?? 0);

    const tax = new Prisma.Decimal(purchase.tax ?? 0);

    const beforePercentageDiscount = subtotal
      .plus(deliveryFee)
      .plus(packagingFee)
      .plus(tax)
      .minus(discount);

    const percentageDiscount = beforePercentageDiscount
      .mul(discountPercent)
      .div(100);

    const total = beforePercentageDiscount.minus(percentageDiscount);

    const paymentTotal = this.calculatePaymentAmount(
      purchase.purchasePayments.map((payment) => ({
        amount: Number(payment.amount),
      })),
    );

    return {
      success: true,
      message: 'Purchase fetched successfully',

      data: {
        ...purchase,

        totals: {
          subtotal: subtotal.toString(),
          deliveryFee: deliveryFee.toString(),
          packagingFee: packagingFee.toString(),
          discount: discount.toString(),
          discountPercent: discountPercent.toString(),
          tax: tax.toString(),
          total: total.toString(),
          paymentTotal: paymentTotal.toString(),
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
        // ========================================================
        // EXISTING PURCHASE
        // ========================================================

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
            purchasePayments: true,
          },
        });

        if (!existingPurchase) {
          throw new NotFoundException('Purchase not found');
        }

        // ========================================================
        // CHECK SUPPLIER
        // ========================================================

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

        // ========================================================
        // CHECK PRODUCTS
        // ========================================================

        if (dto.purchaseItems !== undefined) {
          await this.checkPurchaseItems(tx, dto.purchaseItems, companyId);
        }

        // ========================================================
        // CHECK PAYMENTS
        // ========================================================

        if (dto.purchasePayment !== undefined) {
          await this.checkPaymentData(tx, dto.purchasePayment);
        }

        // ========================================================
        // ITEMS
        // ========================================================

        const items =
          dto.purchaseItems !== undefined
            ? dto.purchaseItems
            : existingPurchase.purchaseItems;

        // ========================================================
        // SUBTOTAL
        // ========================================================

        const subtotal = this.calculateItemTotal(items);

        // ========================================================
        // FEES
        // ========================================================

        const deliveryFee =
          dto.deliveryFee !== undefined
            ? new Prisma.Decimal(dto.deliveryFee)
            : new Prisma.Decimal(existingPurchase.deliveryFee);

        const packagingFee =
          dto.packagingFee !== undefined
            ? new Prisma.Decimal(dto.packagingFee)
            : new Prisma.Decimal(existingPurchase.packagingFee);

        const discount =
          dto.discount !== undefined
            ? new Prisma.Decimal(dto.discount)
            : new Prisma.Decimal(existingPurchase.discount);

        const discountPercent =
          dto.discountPercent !== undefined
            ? new Prisma.Decimal(dto.discountPercent)
            : new Prisma.Decimal(existingPurchase.discountPercent);

        const tax =
          dto.tax !== undefined
            ? new Prisma.Decimal(dto.tax)
            : new Prisma.Decimal(existingPurchase.tax);

        // ========================================================
        // TOTAL
        // ========================================================

        const beforePercentageDiscount = subtotal
          .plus(deliveryFee)
          .plus(packagingFee)
          .plus(tax)
          .minus(discount);

        if (beforePercentageDiscount.lessThan(0)) {
          throw new BadRequestException(
            'Discount cannot be greater than the purchase amount',
          );
        }

        const percentageDiscount = beforePercentageDiscount
          .mul(discountPercent)
          .div(100);

        const total = beforePercentageDiscount.minus(percentageDiscount);

        if (total.lessThan(0)) {
          throw new BadRequestException(
            'Discount cannot be greater than the purchase amount',
          );
        }

        // ========================================================
        // PAYMENT
        // ========================================================

        let paymentTotal: Prisma.Decimal;

        if (dto.purchasePayment !== undefined) {
          paymentTotal = this.calculatePaymentAmount(dto.purchasePayment);

          if (!total.equals(paymentTotal)) {
            throw new BadRequestException(
              `Purchase amount mismatch. Purchase total: ${total.toString()}, Payment total: ${paymentTotal.toString()}`,
            );
          }

          await tx.purchasePayment.deleteMany({
            where: {
              purchaseId: id,
            },
          });
        } else {
          paymentTotal = this.calculatePaymentAmount(
            existingPurchase.purchasePayments.map((payment) => ({
              amount: Number(payment.amount),
            })),
          );

          // If purchase amount changes but payment is not
          // provided, existing payment must still match.
          if (!total.equals(paymentTotal)) {
            throw new BadRequestException(
              `Purchase amount mismatch. Purchase total: ${total.toString()}, Existing payment total: ${paymentTotal.toString()}. Please provide purchasePayment.`,
            );
          }
        }

        // ========================================================
        // UPDATE STOCK
        // ========================================================

        if (dto.purchaseItems !== undefined) {
          // DELETE OLD ITEMS
          await tx.purchaseItem.deleteMany({
            where: {
              purchaseId: id,
            },
          });
        }

        // ========================================================
        // UPDATE PURCHASE
        // ========================================================

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

            deliveryFee,
            packagingFee,
            discount,
            discountPercent,
            tax,
            totalAmount: total,

            // ==================================================
            // CREATE NEW ITEMS
            // ==================================================

            ...(dto.purchaseItems !== undefined && {
              purchaseItems: {
                create: dto.purchaseItems.map((item) => ({
                  productId: item.productId!,
                  quantity: item.quantity,
                  price: new Prisma.Decimal(item.price),
                })),
              },
            }),

            // ==================================================
            // CREATE NEW PAYMENTS
            // ==================================================

            ...(dto.purchasePayment !== undefined && {
              purchasePayments: {
                create: dto.purchasePayment.map((payment) => ({
                  paymentData: {
                    connect: {
                      id: payment.paymentDataId,
                    },
                  },

                  amount: new Prisma.Decimal(payment.amount),

                  type: payment.type,
                })),
              },
            }),
          },

          include: {
            supplier: true,

            purchaseItems: {
              include: {
                product: true,
              },
            },

            purchasePayments: {
              include: {
                paymentData: true,
              },
            },
          },
        });

        return {
          updated,
          subtotal,
          deliveryFee,
          packagingFee,
          discount,
          discountPercent,
          tax,
          total,
          paymentTotal,
        };
      });

      return {
        success: true,
        message: 'Purchase updated successfully',

        data: result.updated,

        meta: {
          subtotal: result.subtotal.toString(),
          deliveryFee: result.deliveryFee.toString(),
          packagingFee: result.packagingFee.toString(),
          discount: result.discount.toString(),
          discountPercent: result.discountPercent.toString(),
          tax: result.tax.toString(),
          total: result.total.toString(),
          paymentTotal: result.paymentTotal.toString(),
        },
      };
    } catch (error) {
      console.error('Purchase update error:', error);

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
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

        // ======================================================
        // ROLLBACK STOCK
        // ======================================================

        const stockMap = new Map<number, number>();

        for (const item of purchase.purchaseItems) {
          const productId = item.productId;

          if (productId == null) {
            continue;
          }

          stockMap.set(
            productId,
            (stockMap.get(productId) ?? 0) + item.quantity,
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

        // ======================================================
        // SOFT DELETE
        // ======================================================

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
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new ForbiddenException('Unable to delete purchase');
    }
  }

  async updateSuccess(id: number) {
    console.log('update is success is ', id);
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const purchase = await tx.purchase.findUnique({
          where: {
            id,
          },

          include: {
            purchaseItems: true,
          },
        });

        if (!purchase) {
          throw new NotFoundException('Purchase not found');
        }

        // ======================================================
        // UPDATE STOCK
        // ======================================================
        const values = Prisma.join(
          purchase.purchaseItems.map(
            (pr) =>
              Prisma.sql`(${pr.productId}::int, ${pr.quantity}::int, ${pr.price}::int)`,
          ),
          ',',
        );

        await tx.$executeRaw`
          UPDATE "Product" AS p
          SET
            "stock" = p."stock" + v.qty,
            "costPrice" = v.price,
            "avgCostPrice" = ((p."price" * p."stock") + (v.price * v.qty)) / (p.stock + v.qty)
          FROM (VALUES ${values}) AS v(id, qty, price)
          WHERE p.id = v.id
        `;
        const data = await tx.purchase.update({
          where: {
            id,
          },
          data: {
            status: 'SUCCESS',
          },
        });

        return data;
      });

      return {
        success: true,
        message: 'Purchase confirmed successfully',
        data: result,
      };
    } catch (error) {
      console.error('Purchase delete error:', error);

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new ForbiddenException('Unable to delete purchase');
    }
  }

  // ============================================================
  // CHECK PURCHASE ITEMS / PRODUCTS
  // ============================================================

  private async checkPurchaseItems(
    tx: Prisma.TransactionClient,
    purchaseItems: {
      productId?: number;
      quantity: number;
      price: number;
    }[],
    companyId: number,
  ) {
    if (purchaseItems.length === 0) {
      throw new BadRequestException('At least one purchase item is required');
    }

    const productIds: number[] = [];

    for (const item of purchaseItems) {
      if (item.productId == null) {
        throw new BadRequestException(
          'Product ID is required for purchase item',
        );
      }

      if (item.quantity <= 0) {
        throw new BadRequestException(
          `Invalid quantity for product ${item.productId}`,
        );
      }

      if (Number(item.price) < 0) {
        throw new BadRequestException(
          `Invalid price for product ${item.productId}`,
        );
      }

      productIds.push(item.productId);
    }

    const uniqueProductIds = [...new Set(productIds)];

    const products = await tx.product.findMany({
      where: {
        id: {
          in: uniqueProductIds,
        },

        companyId,

        isDeleted: false,
      },

      select: {
        id: true,
      },
    });

    const existingProductIds = new Set(products.map((product) => product.id));

    const notExistProductIds = uniqueProductIds.filter(
      (productId) => !existingProductIds.has(productId),
    );

    if (notExistProductIds.length > 0) {
      throw new NotFoundException(
        `Product not found: ${notExistProductIds.join(', ')}`,
      );
    }

    return true;
  }

  // ============================================================
  // CHECK PAYMENT DATA
  // ============================================================

  private async checkPaymentData(
    tx: Prisma.TransactionClient,
    purchasePayment: CreatePurchasePaymentDto[],
  ) {
    if (purchasePayment.length === 0) {
      throw new BadRequestException('At least one payment is required');
    }

    const paymentIds: number[] = purchasePayment.map(
      (payment) => payment.paymentDataId,
    );

    const uniquePaymentIds = [...new Set(paymentIds)];

    const paymentDatas = await tx.paymentData.findMany({
      where: {
        id: {
          in: uniquePaymentIds,
        },
      },

      select: {
        id: true,
        accountName: true,
      },
    });

    const existingPaymentIds = new Set(
      paymentDatas.map((payment) => payment.id),
    );

    const notExistPaymentIds = uniquePaymentIds.filter(
      (paymentId) => !existingPaymentIds.has(paymentId),
    );

    if (notExistPaymentIds.length > 0) {
      throw new NotFoundException(
        `Payment data not found: ${notExistPaymentIds.join(', ')}`,
      );
    }

    for (const payment of purchasePayment) {
      if (Number(payment.amount) <= 0) {
        throw new BadRequestException(
          `Payment amount must be greater than 0 for payment data ${payment.paymentDataId}`,
        );
      }
    }

    return true;
  }

  // ============================================================
  // CALCULATE ITEM TOTAL
  // ============================================================

  private calculateItemTotal(
    items: {
      price: number | Prisma.Decimal;
      quantity: number;
    }[],
  ): Prisma.Decimal {
    return items.reduce((total, item) => {
      const price = new Prisma.Decimal(item.price);

      const quantity = new Prisma.Decimal(item.quantity);

      return total.plus(price.mul(quantity));
    }, new Prisma.Decimal(0));
  }

  // ============================================================
  // CALCULATE PAYMENT TOTAL
  // ============================================================

  private calculatePaymentAmount(
    payments: {
      amount: number | Prisma.Decimal;
    }[],
  ): Prisma.Decimal {
    return payments.reduce((total, payment) => {
      return total.plus(new Prisma.Decimal(payment.amount));
    }, new Prisma.Decimal(0));
  }

  // ============================================================
  // UPDATE PRODUCT STOCK
  // ============================================================

  private async updateStock(
    tx: Prisma.TransactionClient,
    items: {
      productId?: number;
      quantity: number;
    }[],
  ) {
    const stockMap = new Map<number, number>();

    for (const item of items) {
      const productId = item.productId;

      if (productId == null) {
        continue;
      }

      stockMap.set(productId, (stockMap.get(productId) ?? 0) + item.quantity);
    }

    for (const [productId, quantity] of stockMap.entries()) {
      await tx.product.update({
        where: {
          id: productId,
        },

        data: {
          stock: {
            increment: quantity,
          },
        },
      });
    }
  }
}
