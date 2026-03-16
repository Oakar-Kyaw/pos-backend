import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreateGeneralExpenseDto } from './dto/create-general-expense.dto';
import { UpdateGeneralExpenseDto } from './dto/update-general-expense.dto';

@Injectable()
export class GeneralExpenseService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateGeneralExpenseDto,
    userId: number,
    companyId: number,
    branchId?: number,
  ) {
    // 1️⃣ Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }
    console.log('create general expense for user:', dto);
    // 2️⃣ Create expense
    const expense = await this.prisma.generalExpense.create({
      data: {
        title: dto.title,
        reason: dto.reason,
        date: dto.date,
        amount: new Prisma.Decimal(dto.amount),

        company: { connect: { id: companyId } },
        user: { connect: { id: userId } },
        ...(branchId && { branch: { connect: { id: branchId } } }),
      },
    });

    return {
      success: true,
      message: 'General expense created successfully',
      data: expense,
    };
  }

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
    // Ensure endDate defaults to today if not provided
    const today = new Date();
    endDate = endDate ? new Date(endDate) : today;

    // If startDate is after endDate, reset startDate to endDate
    if (startDate && startDate > endDate) {
      startDate = endDate;
    }
    const where: any = {
      companyId,
      isDeleted: false,
      ...(branchId && { branchId }),
      ...(userId && { userId }),
    };

    // 📅 Date filtering
    if (startDate && endDate) {
      where.date = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && {
          lt: new Date(endDate.getTime() + 24 * 60 * 60 * 1000),
        }),
      };
    }
    console.log('date is ', startDate, endDate, userId);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.generalExpense.findMany({
        where,
        orderBy: [
          { date: 'desc' }, // first order by date
          { amount: 'desc' }, // then order by amount
        ],

        skip,
        take: limit,
      }),
      this.prisma.generalExpense.count({ where }),
    ]);

    return {
      success: true,
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const expense = await this.prisma.generalExpense.findFirst({
      where: { id, isDeleted: false },
    });

    if (!expense) {
      throw new NotFoundException('GeneralExpense not found');
    }

    return expense;
  }

  async update(id: number, dto: UpdateGeneralExpenseDto) {
    await this.findOne(id);

    const updated = await this.prisma.generalExpense.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.reason !== undefined && { reason: dto.reason }),
        ...(dto.date !== undefined && { date: dto.date }),
        ...(dto.amount !== undefined && {
          amount: new Prisma.Decimal(dto.amount),
        }),
      },
    });

    return {
      success: true,
      message: 'General expense updated successfully',
      data: updated,
    };
  }

  async remove(id: number) {
    await this.findOne(id);

    // ✅ Soft delete instead of hard delete
    await this.prisma.generalExpense.update({
      where: { id },
      data: { isDeleted: true },
    });

    return {
      success: true,
      message: 'General expense deleted successfully',
    };
  }
}
