import { Expose, Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsDate,
} from 'class-validator';
import { SubscriptionPaymentType, SubscriptionStatus } from '@prisma/client';

export class CreateSubscriptionDto {
  @Expose()
  @IsNotEmpty()
  @IsEnum(SubscriptionPaymentType)
  readonly type: SubscriptionPaymentType;

  @Expose()
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  readonly amount: number;

  @Expose()
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  readonly planId: number;

  @Expose()
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  readonly endDate: Date;

  @Expose()
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  readonly status?: SubscriptionStatus;
}
