import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { FileUpload } from 'src/utils/file-upload';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import sharp from 'sharp';

@Injectable()
export class VouchersService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('voucher-photos') private voucherPhotoQueue: Queue,
    readonly uploadFile: FileUpload,
  ) {}

  // ================= CREATE =================
  async create(
    dto: CreateVoucherDto,
    userId: number,
    companyId: number,
    branchId: number,
    files: Express.Multer.File[],
  ) {
    try {
      //console.log('dto is: ', dto);
      // 🔥 calculate totals securely (do NOT trust frontend)
      const subTotal = dto.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      const tax = dto?.tax ?? 0; // example 10% tax
      const deliveryFee = dto?.deliveryFee ?? 0;
      const total = subTotal + tax + deliveryFee;
      const voucherCode = await this.generateVoucherCode(companyId, dto.type);
      const voucher = await this.prisma.$transaction(async (tx) => {
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
            total,
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
  ) {
    const page = pageNumber < 1 ? 1 : pageNumber; // ensure minimum 1
    const skip = (page - 1) * limit;

    const where: Prisma.VoucherWhereInput = {
      userId,
      companyId,
      ...{ branchId },
      isDeleted: false,
      ...(search && {
        OR: [
          { voucherCode: { contains: search, mode: 'insensitive' } },
          { note: { contains: search, mode: 'insensitive' } },
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
  async findOne(id: number, userId: number, companyId: number) {
    const voucher = await this.prisma.voucher.findFirst({
      where: {
        id,
        userId,
        companyId,
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
    await this.findOne(id, userId, companyId);

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
  async remove(id: number, userId: number, companyId: number) {
    await this.findOne(id, userId, companyId);

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
}
