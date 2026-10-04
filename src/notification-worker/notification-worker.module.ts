import { Module } from '@nestjs/common';
import { NotificationWorkerService } from './notification-worker.service';
import { NotificationWorkerController } from './notification-worker.controller';
import { NotificationModule } from './notification/notification.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'prisma/prisma.module';
import { ProductWorkerModule } from './product-worker/product-worker.module';
import { UserWorkerModule } from './notification/user-worker/user-worker.module';

@Module({
  imports: [
    NotificationModule,
    ProductWorkerModule,
    UserWorkerModule,
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
  ],
  controllers: [NotificationWorkerController],
  providers: [NotificationWorkerService],
})
export class NotificationWorkerModule {
  constructor() {
    console.log('init');
  }
}
