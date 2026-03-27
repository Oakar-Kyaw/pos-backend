import { PartialType } from '@nestjs/mapped-types';
import { CreateSubscriptionPaymentDto } from './create-subscription-payment.dto';

export class UpdateSubscriptionPaymentDto extends PartialType(CreateSubscriptionPaymentDto) {}
