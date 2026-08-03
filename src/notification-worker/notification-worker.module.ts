import { Module } from '@nestjs/common';
import { NotificationWorkerService } from './notification-worker.service';
import { NotificationWorkerController } from './notification-worker.controller';
import { NotificationModule } from './notification/notification.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [
    NotificationModule,
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
  ],
  controllers: [NotificationWorkerController],
  providers: [NotificationWorkerService],
})
export class NotificationWorkerModule {}
