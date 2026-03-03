import { Expose, Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsInt, Min } from 'class-validator';

export class CreateRefundItemDto {
  @Expose()
  @IsOptional()
  @IsInt()
  readonly productId?: number;

  @Expose()
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  readonly quantity: number;

  @Expose()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  readonly price: number;
}
