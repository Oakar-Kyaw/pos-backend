import { Expose, Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  IsBoolean,
  IsNumber,
} from 'class-validator';

export class CreatePlanDto {
  @Expose()
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => String(value).trim())
  readonly name: string;

  @Expose()
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => String(value).trim())
  readonly title: string;

  @Expose()
  @IsNotEmpty()
  @IsInt()
  @Transform(({ value }) => Number(value))
  readonly durationDays: number;

  @Expose()
  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  readonly priceMMK: number;

  @Expose()
  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  readonly priceUSD: number;

  @Expose()
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value ? Number(value) : 0))
  readonly discountPercent?: number;

  @Expose()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  readonly isPopular?: boolean;

  @Expose()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  readonly isActive?: boolean;
}
