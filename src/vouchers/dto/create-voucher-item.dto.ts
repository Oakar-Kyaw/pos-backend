import { Expose, Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateVoucherItemDto {
  @Expose()
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  readonly productId: number;

  @Expose()
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  readonly itemId: number;

  @Expose()
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly name: string;

  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly photoUrl?: string;

  @Expose()
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  readonly quantity: number;

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
  readonly avgCostPrice: number;

  @Expose()
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly costPrice: number;
}
