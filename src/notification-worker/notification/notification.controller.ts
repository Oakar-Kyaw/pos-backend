import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Patch,
  Param,
} from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('api/v1/notifications')
export class NotificationController {
  constructor(private readonly pushNotificationService: NotificationService) {}

  @Post('send-notification')
  async sendNotification(@Body() body) {
    return this.pushNotificationService.sendNotification(body);
  }
}
