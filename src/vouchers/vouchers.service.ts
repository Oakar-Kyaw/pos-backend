import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { FileUpload } from 'src/utils/file-upload';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CreateRepaymentDto } from './dto/create-repayment.dto';
import { isAdmin, isManager } from 'src/utils/check-user-role';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VouchersService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('voucher-photos') private voucherPhotoQueue: Queue,
    private readonly configService: ConfigService,
    readonly uploadFile: FileUpload,
  ) {}

  // ================= CREATE =================
  // ================= CREATE =================
  // ================= CREATE =================
  async create(
    dto: CreateVoucherDto,
    userId: number,
    companyId: number,
    branchId: number,
    files: Express.Multer.File[],
  ) {
    try {
      console.log('dto is: ', dto);
      // 🔥 calculate totals securely (do NOT trust frontend)
      const subTotal = dto.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      const tax = dto?.tax ?? 0; // example 10% tax
      const deliveryFee = dto?.deliveryFee ?? 0;
      const discountAmount = dto.discountAmount ?? 0;
      const discountPercent = dto.discountPercent ?? 0;
      const total = subTotal + tax + deliveryFee;

      // percentage-based discount, guarded against 0/negative
      const percentDiscountAmount =
        discountPercent > 0 ? total * (discountPercent / 100) : 0;

      let totalWithTaxAndDiscount =
        total - discountAmount - percentDiscountAmount;

      // clamp so total never goes negative from an overly large discount
      if (totalWithTaxAndDiscount < 0) {
        totalWithTaxAndDiscount = 0;
      }

      const totalPaymentAmount = dto.payments.reduce(
        (sum, p) => sum + p.amount,
        0,
      );

      if (totalPaymentAmount > totalWithTaxAndDiscount) {
        throw new ForbiddenException(
          'Total payment amount cannot exceed total voucher amount',
        );
      }

      const debt = totalWithTaxAndDiscount - totalPaymentAmount;

      const voucherCode = await this.generateVoucherCode(companyId, dto.type);

      // Collect items that dropped to/below minStock so we can notify
      // AFTER the transaction commits (never notify on a rolled-back order)
      const lowStockItems: {
        id: number;
        name: string;
        stock: number;
        minStock: number;
      }[] = [];

      const voucher = await this.prisma.$transaction(async (tx) => {
        // ---------------------------------------------------------
        // Deduct stock FIRST, atomically, before creating anything.
        // Using RETURNING lets us grab the POST-deduction stock in the
        // same round trip — no separate read needed, so there's no
        // window where another transaction could sneak in a change
        // between "deduct" and "check how much is left".
        // The WHERE stock >= quantity guard makes this whole statement
        // atomic: Postgres locks the row for the duration of the
        // UPDATE, so two concurrent requests can never both succeed
        // against the same pre-deduction value.
        // ---------------------------------------------------------
        for (const item of dto.items) {
          const rows = await tx.$queryRaw<
            { id: number; name: string; stock: number; minStock: number }[]
          >`
            UPDATE "Product"
            SET stock = stock - ${item.quantity}
            WHERE id = ${item.itemId} AND stock >= ${item.quantity}
            RETURNING id, name, stock, "minStock"
          `;

          if (rows.length === 0) {
            // Either the item doesn't exist, or stock is insufficient
            // (possibly because a concurrent request just took it).
            throw new ForbiddenException(
              `Insufficient stock for item ${item.itemId}`,
            );
          }

          const updated = rows[0];
          if (updated.stock <= updated.minStock) {
            lowStockItems.push(updated);
          }
        }

        const createdVoucher = await tx.voucher.create({
          data: {
            type: dto.type,
            voucherCode,
            note: dto.note,
            subTotal,
            tax,
            deliveryFee,
            totalPaymentAmount: dto.totalPaymentAmount,
            remainingPaymentAmount: dto.remainingPaymentAmount,
            total: totalWithTaxAndDiscount,
            discountAmount,
            discountPercent,
            debt,
            existDebt: debt > 0,
            userId,
            companyId,
            branchId,
          },
        });

        await tx.voucherItem.createMany({
          data: dto.items.map((item) => ({
            voucherId: createdVoucher.id,
            itemId: item.itemId,
            name: item.name,
            photoUrl: item.photoUrl,
            quantity: item.quantity,
            price: item.price,
          })),
        });

        await tx.payment.createMany({
          data: dto.payments.map((payData) => ({
            voucherId: createdVoucher.id,
            paymentDataId: payData.paymentDataId,
            amount: payData.amount,
            type: payData.type,
          })),
        });

        return createdVoucher;
      });

      // Notify about low stock — only reaches here if the transaction
      // above actually committed, so we never alert on a failed/rolled
      // back order. Fire-and-forget via queue so a notification-service
      // hiccup can't fail the voucher response.
      console.log('low stock item: ', lowStockItems);
      if (lowStockItems.length > 0) {
        for (const item of lowStockItems) {
          console.log('item is: ', item);
          // await this.stockNotificationQueue.add(
          //   'low-stock-alert',
          //   {
          //     itemId: item.id,
          //     itemName: item.name,
          //     currentStock: item.stock,
          //     minStock: item.minStock,
          //     companyId,
          //     branchId,
          //   },
          //   {
          //     attempts: 3,
          //     backoff: { type: 'exponential', delay: 3000 },
          //     removeOnComplete: true,
          //   },
          // );
        }
      }

      //send photo to background work
      if (files.length > 0) {
        console.log('files ', files);
        await this.voucherPhotoQueue.add(
          'upload-photos',
          {
            voucherId: voucher.id,
            tempPaths: files.map((f) => f.path),
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 3000 },
            removeOnComplete: true,
          },
        );
      }

      return {
        success: true,
        message: 'Voucher created successfully',
        data: voucher,
      };
    } catch (error) {
      console.log('Voucher create error:', error);
      if (error instanceof ForbiddenException) {
        throw error; // preserve the specific stock/payment error message
      }
      throw new ForbiddenException('Unable to create voucher');
    }
  }

  // ================= FIND ALL =================
  async findAll(
    userId: number,
    companyId: number,
    branchId: number,
    pageNumber = 1,
    limit = 10,
    search?: string,
    existDebt?: boolean,
    startDate?: Date,
    endDate?: Date,
  ) {
    const page = pageNumber < 1 ? 1 : pageNumber; // ensure minimum 1
    const skip = (page - 1) * limit;
    // Ensure endDate defaults to today if not provided
    const today = new Date();
    endDate = endDate ? new Date(endDate) : today;

    // If startDate is after endDate, reset startDate to endDate
    if (startDate && startDate > endDate) {
      startDate = endDate;
    }

    let parsedDate: Date | null = null;
    let isValidDate = false;
    //console.log('debt is ', existDebt);
    if (search && /^\d{4}-\d{2}-\d{2}$/.test(search)) {
      const tempDate = new Date(search);

      if (!isNaN(tempDate.getTime())) {
        parsedDate = tempDate;
        isValidDate = true;
      }
    }
    console.log('config adata', this.configService.get<number>('REDIS_TTL'));
    console.log('start date and end date ', startDate, endDate);
    const where: Prisma.VoucherWhereInput = {
      userId,
      companyId,
      ...(branchId && { branchId }),
      isDeleted: false,
      ...(startDate && endDate
        ? {
            createdAt: {
              gte: new Date(startDate),
              lt: new Date(endDate.getTime() + 24 * 60 * 60 * 1000),
            },
          }
        : {}),
      ...(existDebt !== undefined && { existDebt }),
      ...(search && {
        OR: [
          { voucherCode: { contains: search, mode: 'insensitive' } },
          { note: { contains: search, mode: 'insensitive' } },
          ...(isValidDate && parsedDate
            ? [
                {
                  createdAt: {
                    gte: parsedDate,
                    lt: new Date(parsedDate.getTime() + 24 * 60 * 60 * 1000),
                  },
                },
              ]
            : []),
        ],
      }),
    };

    if (search) {
      const vouchers = await this.prisma.voucher.findMany({
        where,
        include: {
          items: true,
          payments: {
            include: {
              paymentData: true,
            },
          },
        },
        orderBy: { id: 'desc' },
      });
      console.log('search vouchers ', vouchers);
      return {
        success: true,
        message: 'Vouchers fetched successfully',
        data: vouchers,
        meta: {
          total: vouchers.length,
          isSearch: true,
        },
      };
    }

    const [vouchers, total] = await Promise.all([
      this.prisma.voucher.findMany({
        where,
        include: {
          items: true,
          paymentPhotos: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
          payments: {
            include: {
              paymentData: true,
            },
          },
        },
        orderBy: { id: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.voucher.count({ where }),
    ]);

    return {
      success: true,
      message: 'Vouchers fetched successfully',
      data: vouchers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ================= FIND ONE =================
  async findOne(id: number) {
    const voucher = await this.prisma.voucher.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      include: {
        items: true,
        payments: {
          include: {
            paymentData: true,
          },
        },
        company: true,
        paymentPhotos: true,
      },
    });

    if (!voucher) {
      throw new NotFoundException({
        success: false,
        message: 'Voucher not found',
        data: null,
      });
    }
    console.log('voucher ', voucher);
    return {
      success: true,
      message: 'Voucher fetched successfully',
      data: voucher,
    };
  }

  // ================= UPDATE =================
  async update(
    id: number,
    dto: UpdateVoucherDto,
    userId: number,
    companyId: number,
  ) {
    await this.findOne(id);

    const subTotal = dto.items?.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const tax = subTotal ? subTotal * 0.1 : undefined;
    const total = subTotal && tax ? subTotal + tax : undefined;

    const updated = await this.prisma.$transaction(async (tx) => {
      const voucher = await tx.voucher.update({
        where: { id },
        data: {
          type: dto.type,
          note: dto.note,
          ...(subTotal !== undefined && { subTotal }),
          ...(tax !== undefined && { tax }),
          ...(total !== undefined && { total }),
        },
      });

      if (dto.items) {
        await tx.voucherItem.deleteMany({ where: { voucherId: id } });

        await tx.voucherItem.createMany({
          data: dto.items.map((item) => ({
            voucherId: id,
            itemId: item.itemId,
            name: item.name,
            photoUrl: item.photoUrl,
            quantity: item.quantity,
            price: item.price,
          })),
        });
      }

      return voucher;
    });

    return {
      success: true,
      message: 'Voucher updated successfully',
      data: updated,
    };
  }

  // ================= DELETE (SOFT DELETE) =================
  async remove(id: number, role: Role) {
    if (!(isAdmin(role) || isManager(role)))
      throw new UnauthorizedException("Voucher can't be deleted");
    await this.findOne(id);

    const deleted = await this.prisma.voucher.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });

    return {
      success: true,
      message: 'Voucher deleted successfully',
      data: deleted,
    };
  }
  private async generateVoucherCode(
    companyId: number,
    type: string,
  ): Promise<string> {
    const company = await this.prisma.company.findUnique({
      where: { id: Number(companyId) },
    });
    const count = await this.prisma.voucher.count({
      where: { companyId },
    });

    const nextNumber = count + 1;

    const padded = String(nextNumber).padStart(5, '0');

    return `${company?.name.toUpperCase()}-${type.toUpperCase()}-${padded}`;
  }

  async createRepayment(
    dto: CreateRepaymentDto,
    userId: number,
    companyId: number,
    branchId: number,
    files: Express.Multer.File[],
  ) {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // 1️⃣ Check voucher
        const voucher = await tx.voucher.findUnique({
          where: { id: dto.voucherId },
        });

        if (!voucher) {
          throw new Error('Voucher not found');
        }

        if (voucher.remainingPaymentAmount.lte(new Prisma.Decimal(0))) {
          throw new Error('Voucher already fully paid');
        }

        if (dto.amount > Number(voucher.remainingPaymentAmount)) {
          throw new Error('Repayment amount exceeds remaining balance');
        }
        console.log('dto is ', dto);

        // 2️⃣ Create repayment record
        const repay = await tx.repay.create({
          data: {
            voucherId: dto.voucherId,
            paymentDataId: dto.paymentDataId,
            amount: dto.amount,
            userId,
            companyId,
            branchId,
          },
        });

        // 3️⃣ Update voucher remaining amount
        const newRemaining =
          Number(voucher.remainingPaymentAmount) - dto.amount;

        const totalPaymentAmount = Number(voucher.total) - newRemaining;
        console.log('payment', voucher, newRemaining, totalPaymentAmount);
        await tx.voucher.update({
          where: { id: voucher.id },
          data: {
            remainingPaymentAmount: newRemaining,
            debt: newRemaining,
            totalPaymentAmount,
            existDebt: newRemaining > 0,
          },
        });

        return repay;
      });

      // 4️⃣ Background photo upload
      if (files && files.length > 0) {
        await this.voucherPhotoQueue.add(
          'upload-repay-photos',
          {
            repayId: result.id,
            tempPaths: files.map((f) => f.path),
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 3000 },
            removeOnComplete: true,
          },
        );
      }

      return {
        success: true,
        message: 'Repayment created successfully',
        data: result,
      };
    } catch (error) {
      console.log('Repayment create error:', error);
      throw new ForbiddenException(
        error.message || 'Unable to create repayment',
      );
    }
  }

  // ================= FIND ALL REPAYMENTS =================
  async findAllRepayment(
    userId: number,
    companyId: number,
    branchId: number,
    pageNumber = 1,
    limit = 10,
    search?: string,
    voucherId?: number,
  ) {
    const page = pageNumber < 1 ? 1 : pageNumber;
    const skip = (page - 1) * limit;

    let parsedDate: Date | null = null;
    let isValidDate = false;

    // 📅 Check if search is date (YYYY-MM-DD)
    if (search && /^\d{4}-\d{2}-\d{2}$/.test(search)) {
      const tempDate = new Date(search);
      if (!isNaN(tempDate.getTime())) {
        parsedDate = tempDate;
        isValidDate = true;
      }
    }

    const where: Prisma.RepayWhereInput = {
      // userId,
      companyId,
      ...(branchId && { branchId }),
      ...(voucherId && { voucherId }),

      ...(search && {
        OR: [
          {
            voucher: {
              voucherCode: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
          ...(isValidDate && parsedDate
            ? [
                {
                  createdAt: {
                    gte: parsedDate,
                    lt: new Date(parsedDate.getTime() + 24 * 60 * 60 * 1000),
                  },
                },
              ]
            : []),
        ],
      }),
    };

    // 🔍 If searching → no pagination (like your voucher logic)
    if (search) {
      const repays = await this.prisma.repay.findMany({
        where,
        include: {
          voucher: {
            include: {
              items: true,
              payments: true,
              paymentPhotos: true,
            },
          },
          paymentData: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { id: 'desc' },
      });

      return {
        success: true,
        message: 'Repayments fetched successfully',
        data: repays,
        meta: {
          total: repays.length,
          isSearch: true,
        },
      };
    }

    // 📄 Normal pagination
    const [repays, total] = await Promise.all([
      this.prisma.repay.findMany({
        where,
        include: {
          voucher: {
            include: {
              items: true,
              payments: true,
              paymentPhotos: true,
            },
          },
          paymentData: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { id: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.repay.count({ where }),
    ]);

    return {
      success: true,
      message: 'Repayments fetched successfully',
      data: repays,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
