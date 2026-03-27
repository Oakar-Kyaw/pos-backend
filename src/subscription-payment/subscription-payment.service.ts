import { Injectable } from '@nestjs/common';
import { CreateSubscriptionPaymentDto } from './dto/create-subscription-payment.dto';
import { UpdateSubscriptionPaymentDto } from './dto/update-subscription-payment.dto';

@Injectable()
export class SubscriptionPaymentService {
  create(createSubscriptionPaymentDto: CreateSubscriptionPaymentDto) {
    return 'This action adds a new subscriptionPayment';
  }

  findAll() {
    return `This action returns all subscriptionPayment`;
  }

  findOne(id: number) {
    return `This action returns a #${id} subscriptionPayment`;
  }

  update(id: number, updateSubscriptionPaymentDto: UpdateSubscriptionPaymentDto) {
    return `This action updates a #${id} subscriptionPayment`;
  }

  remove(id: number) {
    return `This action removes a #${id} subscriptionPayment`;
  }
}
