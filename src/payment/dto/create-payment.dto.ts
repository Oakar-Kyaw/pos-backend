import { IsNotEmpty, IsNumber, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentType } from '@prisma/client';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  readonly voucherId: number;

  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  readonly paymentDataId: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly amount: number;

  @IsNotEmpty()
  @IsEnum(PaymentType)
  readonly type: PaymentType;
}
