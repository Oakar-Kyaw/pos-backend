import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationNavigationType } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createNotificationDto: CreateNotificationDto,
    userId: number,
    companyId: number,
    branchId?: number,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        ...createNotificationDto,
        userId,
        companyId,
        branchId,
      },
    });

    return {
      success: true,
      message: 'CREATED_NOTIFICATION',
      data: notification,
    };
  }

  async findAll(
    userId: number,
    companyId: number,
    branchId?: number,
    page: number = 1,
    limit: number = 20,
    navigationType?: NotificationNavigationType,
  ) {
    const pageNumber = Number(page);
    const pageSize = Number(limit);

    const skip = (pageNumber - 1) * pageSize;

    const where: any = {
      companyId,
      OR: [
        {
          userId,
        },
        {
          userId: null,
        },
      ],
    };

    if (branchId) {
      where.branchId = branchId;
    }

    if (navigationType) {
      where.navigationType = navigationType;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSize,
      }),

      this.prisma.notification.count({
        where,
      }),
    ]);

    return {
      success: true,
      message: 'NOTIFICATIONS_FETCHED_SUCCESSFULLY',
      data: notifications,
      meta: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async unreadCount(userId: number, companyId: number, branchId?: number) {
    const where: any = {
      companyId,
      OR: [
        {
          userId,
        },
        {
          userId: null,
        },
      ],
      isRead: false,
    };

    if (branchId) {
      where.branchId = branchId;
    }

    const count = await this.prisma.notification.count({
      where,
    });

    return {
      success: true,
      message: 'UNREAD_NOTIFICATION_COUNT',
      data: {
        count,
      },
    };
  }

  async findOne(id: number) {
    if (!Number.isInteger(id)) {
      throw new NotFoundException('INVALID_NOTIFICATION_ID');
    }

    const notification = await this.prisma.notification.findUnique({
      where: {
        id,
      },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return {
      success: true,
      message: 'NOTIFICATION_BY_ID',
      data: notification,
    };
  }

  async update(id: number, updateNotificationDto: UpdateNotificationDto) {
    await this.findOne(id);

    const notification = await this.prisma.notification.update({
      where: {
        id,
      },
      data: updateNotificationDto,
    });

    return {
      success: true,
      message: 'UPDATED_NOTIFICATION',
      data: notification,
    };
  }

  async markAsRead(
    id: number,
    userId: number,
    companyId: number,
    branchId?: number,
  ) {
    const where: any = {
      id,
      companyId,
      OR: [
        {
          userId,
        },
        {
          userId: null,
        },
      ],
    };

    if (branchId) {
      where.branchId = branchId;
    }

    const notification = await this.prisma.notification.findFirst({
      where,
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    const updatedNotification = await this.prisma.notification.update({
      where: {
        id,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'NOTIFICATION_MARKED_AS_READ',
      data: updatedNotification,
    };
  }

  async markAllAsRead(
    userId: number,
    companyId: number,
    branchId?: number,
    navigationType?: NotificationNavigationType,
  ) {
    const where: any = {
      companyId,
      OR: [
        {
          userId,
        },
        {
          userId: null,
        },
      ],
      isRead: false,
    };

    if (branchId) {
      where.branchId = branchId;
    }

    if (navigationType) {
      where.navigationType = navigationType;
    }

    await this.prisma.notification.updateMany({
      where,
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'ALL_NOTIFICATIONS_MARKED_AS_READ',
    };
  }

  async remove(id: number) {
    await this.findOne(id);

    const notification = await this.prisma.notification.delete({
      where: {
        id,
      },
    });

    return {
      success: true,
      message: 'DELETED_NOTIFICATION',
      data: notification,
    };
  }
}
