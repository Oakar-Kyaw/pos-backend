import { Module } from '@nestjs/common';
import { SubscriptionPaymentService } from './subscription-payment.service';
import { SubscriptionPaymentController } from './subscription-payment.controller';

@Module({
  controllers: [SubscriptionPaymentController],
  providers: [SubscriptionPaymentService],
})
export class SubscriptionPaymentModule {}
