import { Expose, Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateProductDto {
  // ===== Basic Info =====

  @Expose()
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly name: string;

  // SKU / Code
  @Expose()
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim().toUpperCase() : null))
  readonly code: string;

  // Barcode (optional)
  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly barcode?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly description?: string;

  // ===== Pricing =====

  @Expose()
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly price: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly costPrice?: number;

  // ===== Stock =====

  @Expose()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  readonly stock?: number;

  @Expose()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  readonly minStock?: number;

  // ===== Status =====

  @Expose()
  @IsOptional()
  @IsBoolean()
  readonly isActive?: boolean;

  // ===== Relations =====

  @Expose()
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  readonly categoryId: number;
}
