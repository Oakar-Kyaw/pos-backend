import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { PrismaService } from 'prisma/prisma.service';
import { FileUpload } from 'src/utils/file-upload';

@Module({
  controllers: [SubscriptionController],
  providers: [SubscriptionService, PrismaService, FileUpload],
})
export class SubscriptionModule {}
