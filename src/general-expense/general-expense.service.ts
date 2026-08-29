import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreateGeneralExpenseDto } from './dto/create-general-expense.dto';
import { UpdateGeneralExpenseDto } from './dto/update-general-expense.dto';
import { CreateGeneralExpensePaymentDto } from './dto/general-expense-payment.dto';

@Injectable()
export class GeneralExpenseService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // CREATE
  // ============================================================

  async create(
    dto: CreateGeneralExpenseDto,
    userId: number,
    companyId: number,
    branchId?: number,
  ) {
    // ------------------------------------------------------------
    // Check User
    // ------------------------------------------------------------

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // ------------------------------------------------------------
    // Transaction
    // ------------------------------------------------------------

    const expense = await this.prisma.$transaction(async (tx) => {
      // --------------------------------------------------------
      // Check Payment Data
      // --------------------------------------------------------

      await this.checkPaymentData(tx, dto.generalExpensePayment);

      // --------------------------------------------------------
      // Calculate Payment Total
      // --------------------------------------------------------

      const paymentAmount = this.calculatePaymentAmount(
        dto.generalExpensePayment,
      );

      // --------------------------------------------------------
      // Check Expense Amount == Payment Amount
      // --------------------------------------------------------

      const expenseAmount = new Prisma.Decimal(dto.amount);

      if (!expenseAmount.equals(paymentAmount)) {
        throw new BadRequestException(
          `Expense amount mismatch. Expense: ${expenseAmount.toString()}, Payment total: ${paymentAmount.toString()}`,
        );
      }

      // --------------------------------------------------------
      // Create Expense
      // --------------------------------------------------------

      const data = await tx.generalExpense.create({
        data: {
          title: dto.title,

          reason: dto.reason,

          date: dto.date,

          // Use payment total as the final amount
          amount: paymentAmount,

          company: {
            connect: {
              id: companyId,
            },
          },

          user: {
            connect: {
              id: userId,
            },
          },

          ...(branchId && {
            branch: {
              connect: {
                id: branchId,
              },
            },
          }),

          generalExpensePayment: {
            create: dto.generalExpensePayment.map((payment) => ({
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
          generalExpensePayment: {
            include: {
              paymentData: true,
            },
          },
        },
      });

      return data;
    });

    return {
      success: true,
      message: 'General expense created successfully',
      data: expense,
    };
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

    // ------------------------------------------------------------
    // Default End Date
    // ------------------------------------------------------------

    const today = new Date();

    endDate = endDate ? new Date(endDate) : today;

    // ------------------------------------------------------------
    // Fix Invalid Date Range
    // ------------------------------------------------------------

    if (startDate && startDate > endDate) {
      startDate = endDate;
    }

    // ------------------------------------------------------------
    // Where
    // ------------------------------------------------------------

    const where: Prisma.GeneralExpenseWhereInput = {
      companyId,

      isDeleted: false,

      ...(branchId && {
        branchId,
      }),

      ...(userId && {
        userId,
      }),
    };

    // ------------------------------------------------------------
    // Date Filter
    // ------------------------------------------------------------

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),

        lt: new Date(endDate.getTime() + 24 * 60 * 60 * 1000),
      };
    }

    // ------------------------------------------------------------
    // Query
    // ------------------------------------------------------------

    const [data, total] = await this.prisma.$transaction([
      this.prisma.generalExpense.findMany({
        where,

        orderBy: [
          {
            date: 'desc',
          },
          {
            amount: 'desc',
          },
        ],

        include: {
          generalExpensePayment: {
            include: {
              paymentData: true,
            },
          },
        },

        skip,

        take: limit,
      }),

      this.prisma.generalExpense.count({
        where,
      }),
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

  // ============================================================
  // FIND ONE
  // ============================================================

  async findOne(id: number) {
    const expense = await this.prisma.generalExpense.findFirst({
      where: {
        id,

        isDeleted: false,
      },

      include: {
        generalExpensePayment: {
          include: {
            paymentData: true,
          },
        },
      },
    });

    if (!expense) {
      throw new NotFoundException('GeneralExpense not found');
    }

    return {
      success: true,

      message: 'Get by id',

      data: expense,
    };
  }

  // ============================================================
  // UPDATE
  // ============================================================

  async update(id: number, dto: UpdateGeneralExpenseDto) {
    // ------------------------------------------------------------
    // Get Existing Expense
    // ------------------------------------------------------------

    const existingExpense = await this.prisma.generalExpense.findFirst({
      where: {
        id,

        isDeleted: false,
      },

      include: {
        generalExpensePayment: true,
      },
    });

    if (!existingExpense) {
      throw new NotFoundException('GeneralExpense not found');
    }

    // ------------------------------------------------------------
    // Transaction
    // ------------------------------------------------------------

    const updated = await this.prisma.$transaction(async (tx) => {
      let finalAmount = existingExpense.amount;

      // ======================================================
      // PAYMENT IS PROVIDED
      // ======================================================

      if (dto.generalExpensePayment !== undefined) {
        // ----------------------------------------------------
        // Check Payment Data
        // ----------------------------------------------------

        await this.checkPaymentData(tx, dto.generalExpensePayment);

        // ----------------------------------------------------
        // Calculate New Payment Total
        // ----------------------------------------------------

        const paymentAmount = this.calculatePaymentAmount(
          dto.generalExpensePayment,
        );

        // ----------------------------------------------------
        // If amount is provided,
        // validate it against payment total
        // ----------------------------------------------------

        if (dto.amount !== undefined) {
          const requestedAmount = new Prisma.Decimal(dto.amount);

          if (!requestedAmount.equals(paymentAmount)) {
            throw new BadRequestException(
              `Expense amount mismatch. Expense: ${requestedAmount.toString()}, Payment total: ${paymentAmount.toString()}`,
            );
          }
        }

        // ----------------------------------------------------
        // Payment total becomes final amount
        // ----------------------------------------------------

        finalAmount = paymentAmount;

        // ----------------------------------------------------
        // Delete Old Payments
        // ----------------------------------------------------

        await tx.generalExpensePayment.deleteMany({
          where: {
            generalExpenseId: id,
          },
        });
      }

      // ======================================================
      // ONLY AMOUNT IS PROVIDED
      // ======================================================
      else if (dto.amount !== undefined) {
        const requestedAmount = new Prisma.Decimal(dto.amount);

        // ----------------------------------------------------
        // Calculate Existing Payment Total
        // ----------------------------------------------------

        const existingPaymentAmount = this.calculatePaymentAmount(
          existingExpense.generalExpensePayment.map((payment) => ({
            paymentDataId: payment.paymentDataId,

            amount: Number(payment.amount),

            type: payment.type,
          })),
        );

        // ----------------------------------------------------
        // Check Amount
        // ----------------------------------------------------

        if (!requestedAmount.equals(existingPaymentAmount)) {
          throw new BadRequestException(
            `Expense amount mismatch. Expense: ${requestedAmount.toString()}, Payment total: ${existingPaymentAmount.toString()}`,
          );
        }

        finalAmount = requestedAmount;
      }

      // ======================================================
      // UPDATE GENERAL EXPENSE
      // ======================================================

      const data = await tx.generalExpense.update({
        where: {
          id,
        },

        data: {
          // ------------------------------------------------
          // Title
          // ------------------------------------------------

          ...(dto.title !== undefined && {
            title: dto.title,
          }),

          // ------------------------------------------------
          // Reason
          // ------------------------------------------------

          ...(dto.reason !== undefined && {
            reason: dto.reason,
          }),

          // ------------------------------------------------
          // Date
          // ------------------------------------------------

          ...(dto.date !== undefined && {
            date: dto.date,
          }),

          // ------------------------------------------------
          // Amount
          // ------------------------------------------------

          amount: finalAmount,

          // ------------------------------------------------
          // New Payments
          // ------------------------------------------------

          ...(dto.generalExpensePayment !== undefined && {
            generalExpensePayment: {
              create: dto.generalExpensePayment.map((payment) => ({
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
          generalExpensePayment: {
            include: {
              paymentData: true,
            },
          },
        },
      });

      return data;
    });

    return {
      success: true,

      message: 'General expense updated successfully',

      data: updated,
    };
  }

  // ============================================================
  // REMOVE
  // ============================================================

  async remove(id: number) {
    await this.findOne(id);

    // ------------------------------------------------------------
    // Soft Delete
    // ------------------------------------------------------------

    await this.prisma.generalExpense.update({
      where: {
        id,
      },

      data: {
        isDeleted: true,
      },
    });

    return {
      success: true,

      message: 'General expense deleted successfully',
    };
  }

  // ============================================================
  // CHECK PAYMENT DATA
  // ============================================================

  async checkPaymentData(
    tx: Prisma.TransactionClient,
    generalExpensePayment: CreateGeneralExpensePaymentDto[],
  ) {
    const paymentIds = generalExpensePayment.map(
      (payment) => payment.paymentDataId,
    );

    // ------------------------------------------------------------
    // Remove Duplicate IDs
    // ------------------------------------------------------------

    const uniquePaymentIds = [...new Set(paymentIds)];

    // ------------------------------------------------------------
    // Find Payment Data
    // ------------------------------------------------------------

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

    // ------------------------------------------------------------
    // Existing IDs
    // ------------------------------------------------------------

    const existingPaymentIds = new Set(
      paymentDatas.map((payment) => payment.id),
    );

    // ------------------------------------------------------------
    // Find Missing IDs
    // ------------------------------------------------------------

    const notExistPaymentIds = uniquePaymentIds.filter(
      (id) => !existingPaymentIds.has(id),
    );

    // ------------------------------------------------------------
    // Throw Error
    // ------------------------------------------------------------

    if (notExistPaymentIds.length > 0) {
      throw new NotFoundException(
        `Payment data not found: ${notExistPaymentIds.join(', ')}`,
      );
    }

    return true;
  }

  // ============================================================
  // CALCULATE PAYMENT AMOUNT
  // ============================================================

  private calculatePaymentAmount(
    payments: {
      amount: number;
    }[],
  ): Prisma.Decimal {
    const total = payments.reduce((sum, payment) => sum + payment.amount, 0);

    return new Prisma.Decimal(total);
  }
}
