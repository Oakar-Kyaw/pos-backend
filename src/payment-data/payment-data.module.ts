import { Module } from '@nestjs/common';
import { PaymentDataService } from './payment-data.service';
import { PaymentDataController } from './payment-data.controller';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [PaymentDataController],
  providers: [PaymentDataService, PrismaService],
})
export class PaymentDataModule {}
