import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';

import { CreateRefundDto } from './dto/create-refund.dto';
import { UpdateRefundDto } from './dto/update-refund.dto';
import { CreateRefundPaymentDto } from './dto/refund-payment.dto';
import { CreateRefundItemDto } from './dto/create-refund-item.dto';

@Injectable()
export class RefundService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // CREATE
  // ============================================================

  async create(
    dto: CreateRefundDto,
    userId: number,
    companyId: number,
    branchId?: number,
  ) {
    // Check voucher
    if (dto.voucherId) {
      const voucher = await this.prisma.voucher.findFirst({
        where: {
          id: dto.voucherId,
          companyId,
          isDeleted: false,
        },
      });

      if (!voucher) {
        throw new NotFoundException('Voucher not found');
      }
    }

    // Calculate total amount
    const totalAmount =
      dto.refundType === 'PARTIAL'
        ? dto.amount
        : dto.refundItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0,
          );

    const refund = await this.prisma.$transaction(async (tx) => {
      // Validate payment data
      await this.checkPaymentData(tx, dto.refundPayment);

      // validate refund item
      await this.checkRefundItems(tx, dto.refundItems);

      // Calculate refund amount from payments
      const totalAmount = dto.refundPayment.reduce(
        (sum, payment) => sum + payment.amount,
        0,
      );

      const amount = new Prisma.Decimal(totalAmount);

      // Calculate item total
      const itemTotal = dto.refundItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      // Make sure payment amount matches refund items
      if (amount.toNumber() !== itemTotal) {
        throw new BadRequestException(
          `Refund amount mismatch. Items total: ${itemTotal}, Payment total: ${amount.toNumber()}`,
        );
      }

      // Create refund
      const refund = await tx.refund.create({
        data: {
          voucherId: dto.voucherId,
          amount: amount,
          reason: dto.reason,
          userId,
          companyId,
          ...(branchId && { branchId }),
          refundType: dto.refundType,

          refundItems: {
            create: dto.refundItems,
          },

          refundPayment: {
            create: dto.refundPayment.map((payment) => ({
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
          refundItems: {
            include: {
              product: true,
            },
          },
          refundPayment: {
            include: {
              paymentData: true,
            },
          },
        },
      });

      // Mark voucher as refunded
      if (dto.voucherId) {
        await tx.voucher.update({
          where: {
            id: dto.voucherId,
          },
          data: {
            isRefund: true,
          },
        });
      }

      return refund;
    });

    return {
      success: true,
      message: 'Refund created successfully',
      data: refund,
    };
  }

  // ============================================================
  // CHECK PAYMENT DATA
  // ============================================================

  async checkPaymentData(
    tx: Prisma.TransactionClient,
    refundPayment?: CreateRefundPaymentDto[],
  ) {
    if (!refundPayment || refundPayment.length === 0) {
      return true;
    }

    const paymentIds = [
      ...new Set(refundPayment.map((payment) => payment.paymentDataId)),
    ];

    const paymentDatas = await tx.paymentData.findMany({
      where: {
        id: {
          in: paymentIds,
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

    const notExistPaymentIds = paymentIds.filter(
      (id) => !existingPaymentIds.has(id),
    );

    if (notExistPaymentIds.length > 0) {
      throw new NotFoundException(
        `Payment data not found: ${notExistPaymentIds.join(', ')}`,
      );
    }

    return true;
  }

  // ============================================================
  // FIND ALL
  // ============================================================

  async findAll(
    userId: number,
    companyId: number,
    branchId: number,
    page: number,
    limit: number,
    startDate?: Date,
    endDate?: Date,
  ) {
    const skip = (page - 1) * limit;

    const today = new Date();
    endDate = endDate ? new Date(endDate) : today;

    if (startDate && startDate > endDate) {
      startDate = endDate;
    }

    const where: Prisma.RefundWhereInput = {
      companyId,
      isDeleted: false,

      ...(branchId && {
        branchId,
      }),

      ...(userId && {
        userId,
      }),
    };

    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lt: new Date(endDate.getTime() + 24 * 60 * 60 * 1000),
      };
    }

    const [refunds, total] = await Promise.all([
      this.prisma.refund.findMany({
        where,

        include: {
          refundItems: {
            include: {
              product: true,
            },
          },

          refundPayment: {
            include: {
              paymentData: true,
            },
          },

          voucher: {
            include: {
              items: true,
              payments: true,
            },
          },
        },

        orderBy: {
          id: 'desc',
        },

        skip,
        take: limit,
      }),

      this.prisma.refund.count({
        where,
      }),
    ]);

    return {
      success: true,
      message: 'Refund list fetched successfully',
      data: refunds,
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

  async findOne(id: number, userId: number, companyId: number) {
    const refund = await this.prisma.refund.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },

      include: {
        refundItems: {
          include: {
            product: true,
          },
        },

        refundPayment: {
          include: {
            paymentData: true,
          },
        },

        voucher: {
          include: {
            items: true,
            payments: true,
          },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException({
        success: false,
        message: 'Refund not found',
        data: null,
      });
    }

    return {
      success: true,
      message: 'Refund fetched successfully',
      data: refund,
    };
  }

  // ============================================================
  // UPDATE
  // ============================================================

  async update(
    id: number,
    dto: UpdateRefundDto,
    userId: number,
    companyId: number,
  ) {
    const existingRefund = await this.prisma.refund.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
      select: {
        voucherId: true,
        amount: true,
        refundType: true,
      },
    });

    if (!existingRefund) {
      throw new NotFoundException('Refund not found');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // ============================================================
      // Check Voucher
      // ============================================================

      if (dto.voucherId !== undefined && dto.voucherId !== null) {
        const voucher = await tx.voucher.findFirst({
          where: {
            id: dto.voucherId,
            companyId,
            isDeleted: false,
          },
        });

        if (!voucher) {
          throw new NotFoundException('Voucher not found');
        }
      }

      // ============================================================
      // Check Payment Data
      // ============================================================

      if (dto.refundPayment !== undefined) {
        await this.checkPaymentData(tx, dto.refundPayment);
      }

      // ============================================================
      // Check Refund Items
      // ============================================================

      if (dto.refundItems !== undefined) {
        await this.checkRefundItems(tx, dto.refundItems);
      }

      // ============================================================
      // Payment + Item Validation
      // ============================================================

      let amount: Prisma.Decimal | undefined;

      // If either payment or items is provided,
      // require both so we can validate the refund amount.
      if (dto.refundPayment !== undefined || dto.refundItems !== undefined) {
        if (dto.refundPayment === undefined || dto.refundItems === undefined) {
          throw new BadRequestException(
            'Refund items and refund payments must be provided together',
          );
        }

        // Calculate amount from payments
        const paymentTotal = dto.refundPayment.reduce(
          (sum, payment) => sum + payment.amount,
          0,
        );

        amount = new Prisma.Decimal(paymentTotal);

        // Calculate amount from items
        const itemTotal = dto.refundItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        );

        // Validate payment total == item total
        if (amount.toNumber() !== itemTotal) {
          throw new BadRequestException(
            `Refund amount mismatch. Items total: ${itemTotal}, Payment total: ${amount.toNumber()}`,
          );
        }

        // ============================================================
        // Delete Existing Refund Items
        // ============================================================

        await tx.refundItem.deleteMany({
          where: {
            refundId: id,
          },
        });

        // ============================================================
        // Delete Existing Refund Payments
        // ============================================================

        await tx.refundPayment.deleteMany({
          where: {
            refundId: id,
          },
        });
      }

      // ============================================================
      // Update Refund
      // ============================================================

      const data = await tx.refund.update({
        where: {
          id,
        },

        data: {
          ...(dto.voucherId !== undefined && {
            voucherId: dto.voucherId,
          }),

          ...(dto.reason !== undefined && {
            reason: dto.reason,
          }),

          ...(dto.refundType !== undefined && {
            refundType: dto.refundType,
          }),

          ...(amount !== undefined && {
            amount,
          }),

          // Create new refund items
          ...(dto.refundItems !== undefined && {
            refundItems: {
              create: dto.refundItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: new Prisma.Decimal(item.price),
              })),
            },
          }),

          // Create new refund payments
          ...(dto.refundPayment !== undefined && {
            refundPayment: {
              create: dto.refundPayment.map((payment) => ({
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
          refundItems: {
            include: {
              product: true,
            },
          },

          refundPayment: {
            include: {
              paymentData: true,
            },
          },

          voucher: {
            include: {
              items: true,
              payments: true,
            },
          },
        },
      });

      // ============================================================
      // Update Voucher Refund Status
      // ============================================================

      if (dto.voucherId !== undefined) {
        // Old voucher changed
        if (
          existingRefund.voucherId &&
          existingRefund.voucherId !== dto.voucherId
        ) {
          await tx.voucher.update({
            where: {
              id: existingRefund.voucherId,
            },
            data: {
              isRefund: false,
            },
          });
        }

        // New voucher
        if (dto.voucherId) {
          await tx.voucher.update({
            where: {
              id: dto.voucherId,
            },
            data: {
              isRefund: true,
            },
          });
        }
      }

      return data;
    });

    return {
      success: true,
      message: 'Refund updated successfully',
      data: updated,
    };
  }
  // ============================================================
  // DELETE - SOFT DELETE
  // ============================================================

  async remove(id: number, userId: number, companyId: number) {
    await this.findOne(id, userId, companyId);

    const deleted = await this.prisma.refund.update({
      where: {
        id,
      },

      data: {
        isDeleted: true,
      },
    });

    return {
      success: true,
      message: 'Refund deleted successfully',
      data: deleted,
    };
  }

  async checkRefundItems(
    tx: Prisma.TransactionClient,
    refundItems: CreateRefundItemDto[],
  ) {
    const productIds = [...new Set(refundItems.map((item) => item.productId))];

    const products = await tx.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      select: {
        id: true,
      },
    });

    const existingProductIds = new Set(products.map((product) => product.id));

    const notExistProductIds = productIds.filter(
      (id) => !existingProductIds.has(id),
    );

    if (notExistProductIds.length > 0) {
      throw new NotFoundException(
        `Product not found: ${notExistProductIds.join(', ')}`,
      );
    }

    return true;
  }
}
