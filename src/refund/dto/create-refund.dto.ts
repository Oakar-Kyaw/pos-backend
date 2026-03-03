import { Expose, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  IsNumber,
  ValidateNested,
  IsArray,
  Min,
} from 'class-validator';
import { PaymentType } from '@prisma/client';
import { CreateRefundItemDto } from './create-refund-item.dto';

export class CreateRefundDto {
  @Expose()
  @IsOptional() // make required if you decide voucherId must exist
  @IsInt()
  readonly voucherId?: number;

  @Expose()
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  readonly amount: number;

  @Expose()
  @IsOptional()
  @IsString()
  readonly reason?: string;

  @Expose()
  @IsNotEmpty()
  @IsEnum(PaymentType)
  readonly paymentType: PaymentType;

  @Expose()
  @IsNotEmpty()
  @IsInt()
  readonly paymentDataId: number;

  @Expose()
  @IsOptional()
  @IsEnum(['FULL', 'PARTIAL'])
  readonly refundType?: 'FULL' | 'PARTIAL';

  // 🔥 Refund Items
  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRefundItemDto)
  readonly refundItems: CreateRefundItemDto[];
}
