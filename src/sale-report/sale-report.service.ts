import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateSaleReportDto } from './dto/create-sale-report.dto';
import { UpdateSaleReportDto } from './dto/update-sale-report.dto';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { connect } from 'http2';
import { messaging } from 'firebase-admin';
import { Decimal } from '@prisma/client/runtime/client';

@Injectable()
export class SaleReportService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateSaleReportDto,
    userId: number,
    companyId: number,
    branchId?: number, // optional
  ) {
    // 1️⃣ Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('Sale user not found');
    }

    // 2️⃣ Start transaction
    return this.prisma.$transaction(async (tx) => {
      const baseData = {
        saleUser: { connect: { id: userId } },
        company: { connect: { id: companyId } },
        ...(branchId && { branch: { connect: { id: branchId } } }),
      };

      const closingDate = new Date(dto.date);

      // 3️⃣ Check if closing balance already exists for the day
      const existingClosing = await tx.saleReport.findFirst({
        where: {
          companyId,
          branchId,
          type: 'CLOSING_BALANCE',
          date: {
            gte: new Date(closingDate.setHours(0, 0, 0, 0)),
            lte: new Date(closingDate.setHours(23, 59, 59, 999)),
          },
        },
      });

      if (existingClosing) {
        throw new BadRequestException(
          'Closing balance already exists for this day',
        );
      }

      // 4️⃣ Check if opening balance already exists for next day
      const nextDay = new Date(dto.date);
      nextDay.setDate(nextDay.getDate() + 1);

      const existingOpening = await tx.saleReport.findFirst({
        where: {
          companyId,
          branchId,
          type: 'OPENING_BALANCE',
          date: {
            gte: new Date(nextDay.setHours(0, 0, 0, 0)),
            lte: new Date(nextDay.setHours(23, 59, 59, 999)),
          },
        },
      });

      if (existingOpening) {
        throw new BadRequestException(
          'Opening balance already exists for the next day',
        );
      }

      // 5️⃣ Create Closing Balance
      const closing = await tx.saleReport.create({
        data: {
          ...baseData,
          date: dto.date,
          type: 'CLOSING_BALANCE',
          isClosed: true,
          amount: new Prisma.Decimal(dto.amount),
          description: 'End of day closing balance',
        },
      });

      // 6️⃣ Create Opening Balance for next day
      const opening = await tx.saleReport.create({
        data: {
          ...baseData,
          date: nextDay,
          type: 'OPENING_BALANCE',
          isClosed: false,
          amount: new Prisma.Decimal(dto.amount),
          description: 'Auto-generated opening balance from previous closing',
        },
      });

      return {
        success: true,
        message: 'Closing created and next day opening generated',
        data: { closing, nextDayOpening: opening },
      };
    });
  }

  async findAll(
    userId: number,
    companyId: number,
    branchId: number,
    page: number,
    limit: number,
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      companyId,
      ...(branchId && { branchId }),
      // ...(userId && { userId }),
    };

    // Date filtering
    if (startDate || endDate) {
      where.date = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.saleReport.findMany({
        where,
        include: {
          saleUser: true,
          company: true,
          branch: true,
        },
        orderBy: {
          date: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.saleReport.count({ where }),
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
    const report = await this.prisma.saleReport.findUnique({
      where: { id },
      include: { saleUser: true },
    });

    if (!report) {
      throw new NotFoundException('SaleReport not found');
    }

    return report;
  }

  async getOpeningAndClosing(date: string) {
    // 1️⃣ Parse date as UTC
    const day = new Date(date);

    // 2️⃣ Start of day (UTC)
    const startOfDay = new Date(
      Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0),
    );

    // 3️⃣ End of day (UTC)
    const endOfDay = new Date(
      Date.UTC(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        23,
        59,
        59,
        999,
      ),
    );

    console.log('startOfDay', startOfDay.toISOString());
    console.log('endOfDay', endOfDay.toISOString());

    const data = await this.prisma.saleReport.findMany({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { date: 'asc' },
    });

    //console.log('data:', data);
    // 5️⃣ Separate opening and closing amounts
    let closingAmount: Decimal | number = 0;
    let openingAmount: Decimal | number = 0;
    let isClosed = false;

    data.forEach((d) => {
      if (d.type === 'CLOSING_BALANCE') {
        closingAmount = d.amount;
        isClosed = d.isClosed;
      }
      if (d.type === 'OPENING_BALANCE') {
        openingAmount = d.amount;
      }
    });

    return {
      success: true,
      message: 'get all opening and closing data',
      data: {
        openingAmount,
        closingAmount,
        isClosed,
      },
    };
  }

  async update(id: number, dto: UpdateSaleReportDto) {
    await this.findOne(id);

    // return this.prisma.saleReport.update({
    //   where: { id },
    //   data: {
    //     ...(dto.date && { date: dto.date }),
    //     ...(dto.type && { type: dto.type }),
    //     ...(dto.amount !== undefined && {
    //       amount: new Prisma.Decimal(dto.amount),
    //     }),
    //     ...(dto.description !== undefined && {
    //       description: dto.description,
    //     }),
    //     ...(dto.saleId && {
    //       saleUser: {
    //         connect: { id: dto.saleId },
    //       },
    //     }),
    //   },
    //   include: {
    //     saleUser: true,
    //   },
    // });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.saleReport.delete({
      where: { id },
    });
  }
}
