import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateSaleReportDto } from './dto/create-sale-report.dto';
import { UpdateSaleReportDto } from './dto/update-sale-report.dto';
import { Prisma, TransactionType, TransferType } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/client';
import { fromZonedTime } from 'date-fns-tz';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { IncomeService } from 'src/income/income.service';

@Injectable()
export class SaleReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly income: IncomeService,
  ) {}

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
          isDeleted: false,
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
          isDeleted: false,
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
    date: string,
  ) {
    const skip = (page - 1) * limit;

    if (!date) {
      throw new BadRequestException('date is required');
    }

    const dateOnly = date.slice(0, 10);
    const timezone = 'Asia/Yangon';
    const startOfDay = fromZonedTime(`${dateOnly}T00:00:00.000`, timezone);
    const endOfDay = fromZonedTime(`${dateOnly}T23:59:59.999`, timezone);
    const where: any = {
      isDeleted: false,
      companyId,
      ...(branchId && { branchId }),
      // ...(userId && { userId }),
      date: { gte: startOfDay, lte: endOfDay },
    };
    // console.log('date of opening amount is ', startOfDay, endOfDay);
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

  async getOpeningAndClosing(
    date: string,
    userId: number,
    companyId: number,
    branchId?: number,
  ) {
    if (!date) {
      throw new BadRequestException('date is required');
    }

    const dateOnly = date.slice(0, 10);
    const timezone = 'Asia/Yangon';
    const startOfDay = fromZonedTime(`${dateOnly}T00:00:00.000`, timezone);
    const endOfDay = fromZonedTime(`${dateOnly}T23:59:59.999`, timezone);

    // 1 Income summary (sale, purchase, expense, debt, refund, repay)
    const result = await this.income.getTotalByDateAndBranchAndCompany(
      companyId,
      startOfDay,
      endOfDay,
      branchId,
    );
    const todaySaleData = result[0];

    const totalGeneralExpense = todaySaleData.expenseAmount;
    const totalPurchase = todaySaleData.purchaseAmount;
    const totalSaleAmount = todaySaleData.total;
    const totalPaidAmount = todaySaleData.paymentIn;
    const totalDebtAmount = todaySaleData.debtAmount;
    const totalRefundAmount = todaySaleData.refundAmount;
    const totalRepayAmount = todaySaleData.repayIn;

    // 2 Opening balance record for this day
    const openingRecord = await this.prisma.saleReport.findFirst({
      where: {
        isDeleted: false,
        companyId,
        branchId,
        type: TransactionType.OPENING_BALANCE,
        date: { gte: startOfDay, lte: endOfDay },
      },
    });

    // 3 Closing balance record for this day
    const closingRecord = await this.prisma.saleReport.findFirst({
      where: {
        isDeleted: false,
        companyId,
        branchId,
        type: TransactionType.CLOSING_BALANCE,
        isClosed: true,
        date: { gte: startOfDay, lte: endOfDay },
      },
    });

    // 4 Transfers for this day (internal + external)
    const transfers = await this.prisma.transfer.findMany({
      where: {
        isDeleted: false,
        companyId,
        branchId,
        date: { gte: startOfDay, lte: endOfDay },
      },
    });

    // Total transfer amount (info/display purposes — all types)
    const totalTransferAmount = transfers.reduce(
      (sum, t) => sum.plus(t.amount),
      new Prisma.Decimal(0),
    );
    // Only INTERNAL transfers actually leave the company/branch pool
    const totalInternalTransferAmount = transfers
      .filter((t) => t.transferType === TransferType.INTERNAL)
      .reduce((sum, t) => sum.plus(t.amount), new Prisma.Decimal(0));

    // Only EXTERNAL transfers actually leave the company/branch pool
    const totalExternalTransferAmount = transfers
      .filter((t) => t.transferType === TransferType.EXTERNAL)
      .reduce((sum, t) => sum.plus(t.amount), new Prisma.Decimal(0));

    // 5 Opening amount
    const openingAmount = openingRecord?.amount ?? new Prisma.Decimal(0);

    // 6 Closing amount
    const closingAmount =
      closingRecord?.amount ??
      openingAmount
        .plus(totalPaidAmount)
        .plus(totalRepayAmount)
        .minus(totalGeneralExpense)
        .minus(totalPurchase)
        .minus(totalRefundAmount)
        .minus(totalExternalTransferAmount);

    return {
      success: true,
      message: 'get all opening and closing data',
      data: {
        totalGeneralExpense,
        totalPurchase,
        totalSaleAmount,
        totalPaidAmount,
        totalDebtAmount,
        totalRefundAmount,
        totalRepayAmount,
        totalTransferAmount,
        totalExternalTransferAmount,
        totalInternalTransferAmount,
        openingAmount,
        closingAmount,
        isClosed: !!closingRecord,
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
    const target = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const dateOnly = target.date.toISOString().slice(0, 10);
      const timezone = 'Asia/Yangon';

      const dayBounds = (dateStr: string) => ({
        gte: fromZonedTime(`${dateStr}T00:00:00.000`, timezone),
        lte: fromZonedTime(`${dateStr}T23:59:59.999`, timezone),
      });

      if (target.type === TransactionType.CLOSING_BALANCE) {
        const nextDay = new Date(target.date);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = nextDay.toISOString().slice(0, 10);

        const nextDayClosing = await tx.saleReport.findFirst({
          where: {
            isDeleted: false,
            companyId: target.companyId,
            branchId: target.branchId,
            type: TransactionType.CLOSING_BALANCE,
            date: dayBounds(nextDayStr),
          },
        });

        // Later day already closed on top of this one → block
        if (nextDayClosing) {
          throw new BadRequestException(
            "Cannot delete: the next day has already been closed based on this balance. Delete the next day's closing first.",
          );
        }

        // Safe to cascade — remove the auto-derived opening of next day too
        await tx.saleReport.updateMany({
          where: {
            isDeleted: false,
            companyId: target.companyId,
            branchId: target.branchId,
            type: TransactionType.OPENING_BALANCE,
            date: dayBounds(nextDayStr),
          },
          data: { isDeleted: true },
        });
      }

      if (target.type === TransactionType.OPENING_BALANCE) {
        // If this day itself is already closed, deleting its opening would corrupt its own closing
        if (target.isClosed) {
          throw new BadRequestException(
            "Cannot delete: this day has already been closed. Delete this day's closing balance first.",
          );
        }

        const prevDay = new Date(target.date);
        prevDay.setDate(prevDay.getDate() - 1);
        const prevDayStr = prevDay.toISOString().slice(0, 10);

        await tx.saleReport.updateMany({
          where: {
            isDeleted: false,
            companyId: target.companyId,
            branchId: target.branchId,
            type: TransactionType.CLOSING_BALANCE,
            date: dayBounds(prevDayStr),
          },
          data: { isDeleted: true },
        });
      }

      const deleted = await tx.saleReport.update({
        where: { id },
        data: { isDeleted: true },
      });

      return {
        success: true,
        message: 'Deleted successfully',
      };
    });
  }

  async createTransferAmount(
    userId: number,
    companyId: number,
    dto: CreateTransferDto,
    branchId?: number,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Sale user not found');
    }

    // Prevent self-transfer
    if (dto.from === dto.to) {
      throw new BadRequestException('From and To account must be different');
    }

    const amount = new Prisma.Decimal(dto.amount);

    await this.prisma.$transaction(async (tx) => {
      const [fromAccount, toAccount] = await Promise.all([
        tx.paymentData.findFirst({
          where: { id: dto.from, companyId, isActive: true },
        }),
        tx.paymentData.findFirst({
          where: { id: dto.to, companyId, isActive: true },
        }),
      ]);
      if (!fromAccount) {
        throw new BadRequestException('Source account not found');
      }
      if (!toAccount) {
        throw new BadRequestException('Destination account not found');
      }

      //  Check sufficient balance
      if (fromAccount.balance.lessThan(amount)) {
        throw new BadRequestException('Insufficient balance in source account');
      }

      await tx.transfer.create({
        data: {
          date: dto.date,
          amount: dto.amount,
          from: dto.from,
          to: dto.to,
          transferType: dto.transferType,
          saleId: userId,
          companyId: companyId,
          ...(branchId && { branchId: Number(branchId) }),
        },
        include: {
          fromAccount: true,
          toAccount: true,
          saleUser: true,
          company: true,
          branch: true,
        },
      });

      // Atomically update both balances
      await tx.paymentData.update({
        where: { id: dto.from },
        data: { balance: { decrement: amount } },
      });

      await tx.paymentData.update({
        where: { id: dto.to },
        data: { balance: { increment: amount } },
      });
    });
    return {
      success: true,
      message: 'Transfer amount created',
    };
  }

  async getTransferAmount(
    date: string,
    userId: number,
    companyId: number,
    branchId?: number,
  ) {
    if (!date) {
      throw new BadRequestException('date is required');
    }

    const dateOnly = date.slice(0, 10);
    const timezone = 'Asia/Yangon';
    const startOfDay = fromZonedTime(`${dateOnly}T00:00:00.000`, timezone);
    const endOfDay = fromZonedTime(`${dateOnly}T23:59:59.999`, timezone);

    // 1 Transfers for this day (in/out)
    const data = await this.prisma.transfer.findMany({
      where: {
        isDeleted: false,
        companyId,
        ...(branchId && { branchId }),
        date: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        fromAccount: true,
        toAccount: true,
        saleUser: true,
      },
      orderBy: {
        id: 'desc',
      },
    });

    return {
      success: true,
      message: 'get all transfer data',
      data,
    };
  }

  async removeTransferAmount(id: number) {
    const data = await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.transfer.update({
        where: { id },
        data: {
          isDeleted: true,
        },
        include: {
          fromAccount: true,
          toAccount: true,
        },
      });
      //readd to fromAccount
      await tx.paymentData.update({
        where: {
          id: Number(deleted.from),
        },
        data: {
          balance: {
            increment: Number(deleted.amount),
          },
        },
      });
      //subtract from toAccount
      await tx.paymentData.update({
        where: {
          id: Number(deleted.to),
        },
        data: {
          balance: {
            decrement: Number(deleted.amount),
          },
        },
      });
    });

    return {
      success: true,
      message: 'Delete Transfer Successfully',
    };
  }
}
