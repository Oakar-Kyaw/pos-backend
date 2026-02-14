import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreatePaymentDataDto } from './dto/create-payment-data.dto';
import { UpdatePaymentDataDto } from './dto/update-payment-data.dto';

@Injectable()
export class PaymentDataService {
  constructor(private readonly prisma: PrismaService) {}

  // ================= CREATE =================
  async create(dto: CreatePaymentDataDto, userId: number, companyId: number) {
    try {
      const paymentData = await this.prisma.paymentData.create({
        data: {
          name: dto.name,
          accountNumber: dto.accountNumber,
          accountName: dto.accountName,
          accountType: dto.accountType,
          userId,
          companyId,
          isActive: dto.isActive ?? true,
        },
      });

      return {
        success: true,
        message: 'Payment data created successfully',
        data: paymentData,
      };
    } catch (error) {
      console.log('PaymentData create error:', error);
      throw new ForbiddenException('Unable to create payment data');
    }
  }

  // ================= FIND ALL =================
  async findAll(userId: number, companyId: number) {
    const paymentDataList = await this.prisma.paymentData.findMany({
      where: { userId, companyId, isActive: true },
      orderBy: { id: 'desc' },
    });

    return {
      success: true,
      message: 'Payment data fetched successfully',
      data: paymentDataList,
    };
  }

  // ================= FIND ONE =================
  async findOne(id: number, userId: number, companyId: number) {
    const paymentData = await this.prisma.paymentData.findFirst({
      where: { id, userId, companyId, isActive: true },
    });

    if (!paymentData) {
      throw new NotFoundException({
        success: false,
        message: 'Payment data not found',
        data: null,
      });
    }

    return {
      success: true,
      message: 'Payment data fetched successfully',
      data: paymentData,
    };
  }

  // ================= UPDATE =================
  async update(
    id: number,
    dto: UpdatePaymentDataDto,
    userId: number,
    companyId: number,
  ) {
    await this.findOne(id, userId, companyId);

    const updated = await this.prisma.paymentData.update({
      where: { id },
      data: {
        name: dto.name,
        accountNumber: dto.accountNumber,
        accountName: dto.accountName,
        accountType: dto.accountType,
        isActive: dto.isActive,
      },
    });

    return {
      success: true,
      message: 'Payment data updated successfully',
      data: updated,
    };
  }

  // ================= DELETE (SOFT DELETE) =================
  async remove(id: number, userId: number, companyId: number) {
    await this.findOne(id, userId, companyId);

    const deleted = await this.prisma.paymentData.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return {
      success: true,
      message: 'Payment data deleted successfully',
      data: deleted,
    };
  }
}
