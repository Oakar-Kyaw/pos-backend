import { Expose, Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  ValidateNested,
  IsArray,
  Min,
} from 'class-validator';
import { CreateVoucherItemDto } from './create-voucher-item.dto';
import { VoucherType } from '@prisma/client';
import { CreatePaymentDto } from 'src/payment/dto/create-payment.dto';
import { VoucherPaymentDto } from './payment-voucher.dto';

export class CreateVoucherDto {
  // ===== Basic Info =====

  @Expose()
  @IsNotEmpty()
  @IsString()
  readonly type: VoucherType;

  @Expose()
  @IsOptional()
  @IsString()
  readonly note?: string;

  // ===== Amounts =====

  @Expose()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly subTotal?: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly tax?: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly discountPercent?: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly discountAmount?: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly deliveryFee?: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly totalPaymentAmount?: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly remainingPaymentAmount?: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly total?: number;

  // ===== Items =====

  @Expose()
  @IsArray()
  @Type(() => CreateVoucherItemDto)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return [];
      }
    }
    return value;
  })
  readonly items: CreateVoucherItemDto[];

  @Expose()
  @IsArray()
  @Type(() => VoucherPaymentDto)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        //  console.log('value is ', value, typeof value);
        return JSON.parse(value);
      } catch (e) {
        return [];
      }
    }
    return value;
  })
  readonly payments: VoucherPaymentDto[];
}
