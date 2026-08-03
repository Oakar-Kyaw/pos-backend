import { Controller } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { NotificationWorkerService } from './notification-worker.service';
import { CreateNotificationWorkerDto } from './dto/create-notification-worker.dto';
import { UpdateNotificationWorkerDto } from './dto/update-notification-worker.dto';
import { LowStockItems } from './interface/low-stock.interface';

@Controller()
export class NotificationWorkerController {
  constructor(
    private readonly notificationWorkerService: NotificationWorkerService,
  ) {}

  @MessagePattern('createNotificationWorker')
  create(@Payload() createNotificationWorkerDto: CreateNotificationWorkerDto) {
    return this.notificationWorkerService.create(createNotificationWorkerDto);
  }

  @MessagePattern('findAllNotificationWorker')
  findAll() {
    return this.notificationWorkerService.findAll();
  }

  @MessagePattern('findOneNotificationWorker')
  findOne(@Payload() id: number) {
    return this.notificationWorkerService.findOne(id);
  }

  @MessagePattern('updateNotificationWorker')
  update(@Payload() updateNotificationWorkerDto: UpdateNotificationWorkerDto) {
    return this.notificationWorkerService.update(
      updateNotificationWorkerDto.id,
      updateNotificationWorkerDto,
    );
  }

  @MessagePattern('removeNotificationWorker')
  remove(@Payload() id: number) {
    return this.notificationWorkerService.remove(id);
  }
  @EventPattern('send_low_stock_alert_push_notification')
  async handle(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    const userId = Number(data['userId']);
    const items = Array.isArray(data['items'])
      ? data['items']
      : [...data['items']];
    const language = data['language'];

    try {
      await this.notificationWorkerService.sendPushNotification({
        userId,
        items,
        language,
      });
      channel.ack(originalMsg); // success ဖြစ်ရင် ack
    } catch (error) {
      console.error('Failed to process notification:', error);
      channel.ack(originalMsg); // fail ဖြစ်လည်း ack (retry loop မဖြစ်အောင်)
      // သို့မဟုတ် channel.nack(originalMsg, false, false); ← DLQ ပို့ချင်ရင်
    }
  }
}
