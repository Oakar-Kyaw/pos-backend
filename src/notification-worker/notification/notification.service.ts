import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import admin from 'firebase-admin';

@Injectable()
export class NotificationService {
  constructor() {}
  async sendNotification(data: any) {
    let {
      userId,
      brandId,
      branchId,
      role,
      title,
      body,
      imageUrl,
      navigationType,
      navigationId,
      icon,
      type,
      token,
      data: extraData,
    } = data;

    // Ensure numeric types
    if (userId && typeof userId === 'string') userId = parseInt(userId, 10);
    try {
      console.log('notification si ', data);
      const message: admin.messaging.Message = {
        token,

        notification: {
          title,
          body,
        },

        android: {
          notification: {
            imageUrl: imageUrl,
          },
        },

        apns: {
          payload: {
            aps: {
              mutableContent: true,
            },
          },
          fcmOptions: {
            imageUrl,
          },
        },

        webpush: {
          notification: {
            title,
            body,
            image: imageUrl,
          },
        },

        data: {
          title,
          body,
          icon: icon ?? '',
          type: type ?? 'GENERAL',
          imageUrl: imageUrl ?? '',
          ...(extraData ?? {}),
        },
      };

      const response = await admin.messaging().send(message);
      console.log('response', response);
      return { success: true, message: 'Notification sent successfully' };
    } catch (error) {
      console.error('FCM Error:', error);
      const code = String(error?.errorInfo?.code || '');

      return { success: false, message: 'FCM Error', error };
    }
  }

  // ---------- Build a single Message object (extracted helper) ----------
  private buildMessage(data: any): admin.messaging.Message {
    let {
      userId,
      title,
      body,
      imageUrl,
      icon,
      type,
      token,
      data: extraData,
    } = data;

    if (userId && typeof userId === 'string') userId = parseInt(userId, 10);

    return {
      token,
      notification: { title, body },
      android: {
        notification: { imageUrl },
      },
      apns: {
        payload: { aps: { mutableContent: true } },
        fcmOptions: { imageUrl },
      },
      webpush: {
        notification: { title, body, image: imageUrl },
      },
      data: {
        title,
        body,
        icon: icon ?? '',
        type: type ?? 'GENERAL',
        imageUrl: imageUrl ?? '',
        ...(extraData ?? {}),
      },
    };
  }

  // ---------- Send multiple notifications (different content per token) ----------
  async sendMultipleNotifications(items: any[]) {
    if (!items || items.length === 0) {
      return {
        success: true,
        message: 'No notifications to send',
        results: [],
      };
    }

    // token မရှိတဲ့ item ကို filter ချ (FCM validation error ကြောင့် batch တစ်ခုလုံး fail မဖြစ်အောင်)
    const validItems = items.filter((item) => !!item.token);
    const skipped = items.length - validItems.length;

    if (validItems.length === 0) {
      return {
        success: false,
        message: 'All items missing device token',
        results: [],
      };
    }

    const messages = validItems.map((item) => this.buildMessage(item));

    try {
      const response = await admin.messaging().sendEach(messages);

      console.log(
        `Batch sent: ${response.successCount} success, ${response.failureCount} failed, ${skipped} skipped (no token)`,
      );

      // Item တစ်ခုချင်းစီရဲ့ result ကို track လုပ်ပါ (ဘယ် token fail ဖြစ်လဲ debug လွယ်အောင်)
      const results = response.responses.map((res, i) => ({
        token: validItems[i].token,
        success: res.success,
        error: res.success ? null : res.error?.message,
      }));

      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) {
        console.error('Failed notifications:', failed);
      }

      return {
        success: response.failureCount === 0,
        message: `Sent ${response.successCount}/${validItems.length} notifications`,
        results,
      };
    } catch (error) {
      console.error('FCM Batch Error:', error);
      return { success: false, message: 'FCM batch send failed', error };
    }
  }
}
