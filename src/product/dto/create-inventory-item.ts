import { PartialType } from '@nestjs/mapped-types';
import { InventoryType } from '@prisma/client';
import { Expose, Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  IsNumber,
  Min,
  IsEnum,
} from 'class-validator';

export class CreateInventoryItemDto {
  @Expose()
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  readonly productId: number;

  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly photoUrl?: string;

  @Expose()
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly quantity: number;

  @Expose()
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly costPrice: number;

  @Expose()
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly avgCostPrice: number;

  @Expose()
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly price: number;

  @Expose()
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly totalAmount: number;
}

export class CreateInventoryDto {
  @Expose()
  @IsNotEmpty()
  @IsEnum(InventoryType)
  @Transform(({ value }) => (value ? value : null))
  readonly type: InventoryType;

  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly reason?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly note?: string;

  @Expose()
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly totalAmount: number;

  @Expose()
  @IsNotEmpty({ each: true })
  @Type(() => CreateInventoryItemDto)
  readonly items: CreateInventoryItemDto[];
}

export class UpdateInventoryDto extends PartialType(CreateInventoryDto) {}
