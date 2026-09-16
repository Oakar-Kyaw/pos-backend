import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateNotificationWorkerDto } from './dto/create-notification-worker.dto';
import { UpdateNotificationWorkerDto } from './dto/update-notification-worker.dto';
import { LowStockItems } from './interface/low-stock.interface';
import { NotificationService } from './notification/notification.service';
import { title } from 'process';
import { NotificationText } from './i18n/notification-language';
import { PrismaService } from 'prisma/prisma.service';
import {
  NotificationNavigationType,
  NotificationType,
  Role,
} from '@prisma/client';

@Injectable()
export class NotificationWorkerService {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
  ) {}
  create(createNotificationWorkerDto: CreateNotificationWorkerDto) {
    return 'This action adds a new notificationWorker';
  }

  findAll() {
    return `This action returns all notificationWorker`;
  }

  findOne(id: number) {
    return `This action returns a #${id} notificationWorker`;
  }

  update(id: number, updateNotificationWorkerDto: UpdateNotificationWorkerDto) {
    return `This action updates a #${id} notificationWorker`;
  }

  remove(id: number) {
    return `This action removes a #${id} notificationWorker`;
  }

  // async sendPushNotification(data: LowStockItems[]) {
  //   await Promise.all(
  //     const tokens = await this.prisma.user.findUnique({where: {id: Number()}})
  //     data.forEach(async (d) => {
  //       try {
  //         const t = NotificationText[d.language] ?? NotificationText['en'];

  //         await this.notificationService.sendNotification({
  //           title: t.LOW_STOCK_TITLE,
  //           body: t.LOW_STOCK_BODY(d.name, d.stock, d.minStock),
  //           imageUrl: encodeURI(d.imageUrl),
  //           token: d.token,
  //         });
  //       } catch (error) {
  //         console.error(`Failed to send notification for ${d.name}:`, error);
  //         // item တစ်ခု fail ဖြစ်ရင် တခြား item တွေ ရပ်မသွားအောင်
  //       }
  //     }),
  //   );

  //   return `This action send push notification`;
  // }

  async sendPushNotification({
    userId,
    items,
    language,
    companyId,
    branchId,
  }: {
    userId: number;
    items: LowStockItems[];
    language: string;
    companyId?: number;
    branchId?: number;
  }) {
    if (items.length === 0) {
      return { success: true, message: 'No low stock items', results: [] };
    }

    const deviceTokens = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: {
          id: Number(userId),
        },
        include: {
          notifictionDeviceToken: true,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const userDeviceTokens = user.notifictionDeviceToken ?? [];

      const adminUserNotificationDeviceTokens =
        await tx.notificationDeviceToken.findMany({
          where: {
            companyId: user.companyId,
            role: {
              in: [Role.ADMIN, Role.MANAGER],
            },
          },
        });

      const uniqueTokens = [
        ...new Set([
          ...userDeviceTokens.map((d) => d.deviceToken),
          ...adminUserNotificationDeviceTokens.map((d) => d.deviceToken),
        ]),
      ];

      return uniqueTokens;
    });

    console.log('tokens are ', deviceTokens);

    if (deviceTokens.length === 0) {
      console.warn(`No active device tokens for user ${userId}`);
      throw new NotFoundException('Active tokens not found');
    }

    const itemList = items
      .map((i) => `${i.name} (${i.stock}/${i.minStock})`)
      .join('\n');

    const t = NotificationText[language ?? 'en'] ?? NotificationText.en;

    const body =
      items.length === 1
        ? t.LOW_STOCK_BODY(items[0].name, items[0].stock, items[0].minStock)
        : t.LOW_STOCK_BODY_MULTIPLE(items.length, itemList);

    const messages = deviceTokens.map((token) => ({
      title: t.LOW_STOCK_TITLE,
      body,
      imageUrl: items[0].imageUrl ? encodeURI(items[0].imageUrl) : undefined,
      token,
    }));

    const results =
      await this.notificationService.sendMultipleNotifications(messages);

    // 4. Save Notification in DB
    const notification = await this.prisma.notification.create({
      data: {
        title: 'Low Stock Alert',
        message: 'Your Products are getting low',
        type: NotificationType.WARNING,
        navigationType: NotificationNavigationType.LOW_STOCK,
        ...(branchId && { branchId: Number(branchId) }),
        ...(companyId && { companyId: Number(companyId) }),

        data: {
          itemCount: items.length,
          items: items.map((i) => ({
            id: i.id,
            name: i.name,
            currentStock: i.stock,
            minStock: i.minStock,
          })),
        },
      },
    });
    return {
      success: results.results?.every((r) => r.success) ?? false,
      message: results.message,
      results: results.results,
    };
  }
}
