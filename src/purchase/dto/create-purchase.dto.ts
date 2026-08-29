import { Expose, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsString,
  ValidateNested,
  Min,
  ArrayNotEmpty,
} from 'class-validator';
import { PurchaseStatus } from '@prisma/client';
import { CreatePurchaseItemDto } from './create-purchase-item.dto';
import { CreatePurchasePaymentDto } from './purchase-payment.dto';

export class CreatePurchaseDto {
  @Expose()
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  readonly supplierId: number;

  @Expose()
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  readonly tax: number;

  @Expose()
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  readonly discount: number;

  @Expose()
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  readonly discountPercent: number;

  @Expose()
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  readonly packagingFee: number;

  @Expose()
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  readonly deliveryFee: number;

  @Expose()
  @IsOptional()
  @IsEnum(PurchaseStatus)
  readonly status?: PurchaseStatus;

  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly note?: string;

  @Expose()
  @IsNotEmpty()
  @Type(() => Date)
  readonly orderDate: Date;

  @Expose()
  @IsOptional()
  @Type(() => Date)
  readonly receivedDate: Date;

  // @Expose()
  // @IsNotEmpty()
  // @IsArray()
  // @ValidateNested({ each: true })
  // @Type(() => CreateRequestItemDto)
  // readonly requestItems: CreateRequestItemDto[];

  @Expose()
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseItemDto)
  readonly purchaseItems: CreatePurchaseItemDto[];

  @Expose()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchasePaymentDto)
  readonly purchasePayment: CreatePurchasePaymentDto[];
}
