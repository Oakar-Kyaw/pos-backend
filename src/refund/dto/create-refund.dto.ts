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
  ArrayNotEmpty,
} from 'class-validator';
import { CreateRefundItemDto } from './create-refund-item.dto';
import { CreateRefundPaymentDto } from './refund-payment.dto';

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
  @IsOptional()
  @IsEnum(['FULL', 'PARTIAL'])
  readonly refundType?: 'FULL' | 'PARTIAL';

  // 🔥 Refund Items
  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRefundItemDto)
  readonly refundItems: CreateRefundItemDto[];

  @Expose()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateRefundPaymentDto)
  readonly refundPayment: CreateRefundPaymentDto[];
}
