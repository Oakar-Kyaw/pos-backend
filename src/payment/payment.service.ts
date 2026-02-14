import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  // ================= CREATE =================
  async create(dto: CreatePaymentDto, userId: number, companyId: number) {
    try {
      // Validate voucher belongs to user & company
      const voucher = await this.prisma.voucher.findFirst({
        where: { id: dto.voucherId, userId, companyId, isDeleted: false },
      });
      if (!voucher) throw new NotFoundException('Voucher not found');

      // Validate paymentData belongs to user & company
      const paymentData = await this.prisma.paymentData.findFirst({
        where: { id: dto.paymentDataId, userId, companyId, isActive: true },
      });
      if (!paymentData) throw new NotFoundException('Payment method not found');

      const payment = await this.prisma.payment.create({
        data: {
          voucherId: dto.voucherId,
          paymentDataId: dto.paymentDataId,
          amount: dto.amount,
        },
      });

      return {
        success: true,
        message: 'Payment created successfully',
        data: payment,
      };
    } catch (error) {
      console.log('Payment create error:', error);
      throw new ForbiddenException('Unable to create payment');
    }
  }

  // ================= FIND ALL =================
  async findAll(userId: number, companyId: number) {
    const payments = await this.prisma.payment.findMany({
      where: { voucher: { userId, companyId, isDeleted: false } },
      include: { voucher: true, paymentData: true },
      orderBy: { id: 'desc' },
    });

    return {
      success: true,
      message: 'Payments fetched successfully',
      data: payments,
    };
  }

  // ================= FIND ONE =================
  async findOne(id: number, userId: number, companyId: number) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, voucher: { userId, companyId, isDeleted: false } },
      include: { voucher: true, paymentData: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return {
      success: true,
      message: 'Payment fetched successfully',
      data: payment,
    };
  }

  // ================= UPDATE =================
  async update(
    id: number,
    dto: UpdatePaymentDto,
    userId: number,
    companyId: number,
  ) {
    //const payment = await this.findOne(id, userId, companyId);
    const updated = await this.prisma.payment.update({
      where: { id },
      data: {
        amount: dto.amount,
        paymentDataId: dto.paymentDataId,
      },
    });
    return {
      success: true,
      message: 'Payment updated successfully',
      data: updated,
    };
  }

  // ================= DELETE =================
  async remove(id: number, userId: number, companyId: number) {
    await this.findOne(id, userId, companyId);
    const deleted = await this.prisma.payment.delete({ where: { id } });
    return {
      success: true,
      message: 'Payment removed successfully',
      data: deleted,
    };
  }
}
