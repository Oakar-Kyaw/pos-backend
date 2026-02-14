import { PartialType } from '@nestjs/mapped-types';
import { CreatePaymentDataDto } from './create-payment-data.dto';

export class UpdatePaymentDataDto extends PartialType(CreatePaymentDataDto) {}
