import { Expose, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateRequestItemDto {
  @Expose()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  readonly productId?: number;

  @Expose()
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  readonly quantity: number;

  @Expose()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  readonly price: number;

  @Expose()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  readonly costPrice: number;
}
