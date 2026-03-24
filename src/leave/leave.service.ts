import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';
import { LeaveStatus } from '@prisma/client';

@Injectable()
export class LeaveService {
  constructor(private readonly prisma: PrismaService) {}

  // ================= CREATE =================
  async create(
    dto: CreateLeaveDto,
    companyId: number,
    branchId?: number,
    imageUrl?: string,
  ) {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: dto.userId,
          companyId,
          isDeleted: false,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const leave = await this.prisma.leave.create({
        data: {
          userId: dto.userId,
          companyId,
          branchId,
          approvedId: dto.approvedId ?? null,
          date: new Date(dto.date),
          title: dto.title,
          status: dto.status ?? LeaveStatus.PENDING,
          imageUrl: imageUrl ?? null,
        },
      });

      return {
        success: true,
        message: 'Leave created successfully',
        data: leave,
      };
    } catch (error) {
      console.log('Leave create error:', error);
      throw new ForbiddenException('Unable to create leave');
    }
  }

  // ================= FIND ALL =================
  async findAll(
    userId?: number,
    companyId?: number,
    branchId?: number,
    page = 1,
    limit = 10,
    startDate?: Date,
    endDate?: Date,
    status?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
      ...(companyId && { companyId }),
      ...(branchId && { branchId }),
      ...(userId && { userId }),
      ...(status && { status }),
    };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lt: new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000),
      };
    }

    const [leaves, total] = await Promise.all([
      this.prisma.leave.findMany({
        where,
        include: {
          user: true,
          approveUser: true,
          company: true,
          branch: true,
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.leave.count({ where }),
    ]);

    return {
      success: true,
      message: 'Leave list fetched successfully',
      data: leaves,
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
    const leave = await this.prisma.leave.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
      include: {
        user: true,
        approveUser: true,
        company: true,
        branch: true,
      },
    });

    if (!leave) {
      throw new NotFoundException({
        success: false,
        message: 'Leave not found',
      });
    }

    return {
      success: true,
      message: 'Leave fetched successfully',
      data: leave,
    };
  }

  // ================= UPDATE =================
  async update(
    id: number,
    dto: UpdateLeaveDto,
    userId: number,
    companyId: number,
  ) {
    await this.findOne(id, userId, companyId);

    const updated = await this.prisma.leave.update({
      where: { id },
      data: {
        title: dto.title,
        date: dto.date ? new Date(dto.date) : undefined,
        status: dto.status,
        approvedId: dto.approvedId,
      },
    });

    return {
      success: true,
      message: 'Leave updated successfully',
      data: updated,
    };
  }

  // ================= DELETE (SOFT) =================
  async remove(id: number, userId: number, companyId: number) {
    await this.findOne(id, userId, companyId);

    const deleted = await this.prisma.leave.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });

    return {
      success: true,
      message: 'Leave deleted successfully',
      data: deleted,
    };
  }
}
