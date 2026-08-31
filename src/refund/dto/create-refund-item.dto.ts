import { Expose, Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateRefundItemDto {
  @Expose()
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  readonly productId: number;

  @Expose()
  @IsNotEmpty()
  @IsNumber()
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
}
