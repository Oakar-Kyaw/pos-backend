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

      await admin.messaging().send(message);
      // console.log('response', response);
      return { success: true, message: 'Notification sent successfully' };
    } catch (error) {
      console.error('FCM Error:', error);
      const code = String(error?.errorInfo?.code || '');

      return { success: false, message: 'FCM Error', error };
    }
  }
}
