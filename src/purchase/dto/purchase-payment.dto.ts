import { Expose, Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { PaymentType } from '@prisma/client';

export class CreatePurchasePaymentDto {
  @Expose()
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  readonly paymentDataId: number;

  @Expose()
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly amount: number;

  @Expose()
  @IsNotEmpty()
  @IsEnum(PaymentType)
  readonly type: PaymentType;
}
