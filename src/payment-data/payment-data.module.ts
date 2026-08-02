import { Module } from '@nestjs/common';
import { PaymentDataService } from './payment-data.service';
import { PaymentDataController } from './payment-data.controller';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentDataController],
  providers: [PaymentDataService],
})
export class PaymentDataModule {}
