import { Expose, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PurchaseStatus } from '@prisma/client';
import { CreatePurchaseItemDto } from './create-purchase-item.dto';
import { CreateRequestItemDto } from './create-request-item.dto';

export class CreatePurchaseDto {
  @Expose()
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  readonly supplierId: number;

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
  @IsNotEmpty()
  @Type(() => Date)
  readonly receivedDate: Date;

  @Expose()
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRequestItemDto)
  readonly requestItems: CreateRequestItemDto[];

  @Expose()
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseItemDto)
  readonly purchaseItems: CreatePurchaseItemDto[];
}
