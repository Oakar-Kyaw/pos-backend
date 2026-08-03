import { PartialType } from '@nestjs/mapped-types';
import { CreateNotificationWorkerDto } from './create-notification-worker.dto';

export class UpdateNotificationWorkerDto extends PartialType(CreateNotificationWorkerDto) {
  id: number;
}
