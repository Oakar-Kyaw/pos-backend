import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { UpdateRefundDto } from './dto/update-refund.dto';

@Injectable()
export class RefundService {
  constructor(private readonly prisma: PrismaService) {}

  // ================= CREATE =================
  async create(
    dto: CreateRefundDto,
    userId: number,
    companyId: number,
    branchId?: number,
  ) {
    try {
      // 🔎 Optional: Check voucher belongs to company
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

      // 💰 Calculate total amount from items (more secure)
      const totalAmount =
        dto.refundType === 'PARTIAL'
          ? dto.amount
          : dto.refundItems.reduce(
              (sum, item) => sum + item.price * item.quantity,
              0,
            );

      const refund = await this.prisma.$transaction(async (tx) => {
        const refund = await tx.refund.create({
          data: {
            voucherId: dto.voucherId,
            amount: totalAmount,
            reason: dto.reason,
            paymentType: dto.paymentType,
            paymentDataId: dto.paymentDataId,
            userId,
            companyId,
            branchId,
            refundType: dto.refundType,
            refundItems: {
              create: dto.refundItems,
            },
          },
          include: {
            refundItems: true,
          },
        });
        await tx.voucher.update({
          where: { id: dto.voucherId },
          data: {
            isRefund: true,
          },
        });
        return refund;
      });
      return {
        success: true,
        message: 'Refund created successfully',
        data: refund,
      };
    } catch (error) {
      console.log('Refund create error:', error);
      throw new ForbiddenException('Unable to create refund');
    }
  }

  // ================= FIND ALL =================
  async findAll(
    userId: number,
    companyId: number,
    branchId: number,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;
    const [refunds, total] = await Promise.all([
      this.prisma.refund.findMany({
        where: {
          companyId,
          ...(branchId && { branchId }),
          isDeleted: false,
        },
        include: {
          paymentData: true,
          refundItems: {
            include: {
              product: true,
            },
          },
          voucher: {
            include: { items: true, payments: true },
          },
        },
        orderBy: { id: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.refund.count({
        where: { companyId, ...(branchId && { branchId }), isDeleted: false },
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

  // ================= FIND ONE =================
  async findOne(id: number, userId: number, companyId: number) {
    const refund = await this.prisma.refund.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
      include: {
        paymentData: true,
        refundItems: {
          include: {
            product: true,
          },
        },
        voucher: {
          include: { items: true, payments: true },
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

  // ================= UPDATE =================
  async update(
    id: number,
    dto: UpdateRefundDto,
    userId: number,
    companyId: number,
  ) {
    await this.findOne(id, userId, companyId);

    const updated = await this.prisma.refund.update({
      where: { id },
      data: {
        reason: dto.reason,
        paymentType: dto.paymentType,
      },
    });

    return {
      success: true,
      message: 'Refund updated successfully',
      data: updated,
    };
  }

  // ================= DELETE (SOFT DELETE) =================
  async remove(id: number, userId: number, companyId: number) {
    await this.findOne(id, userId, companyId);

    const deleted = await this.prisma.refund.update({
      where: { id },
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
}
