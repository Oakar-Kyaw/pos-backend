import { Expose, Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDate,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateSaleReportDto {
  @Expose()
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  readonly date: Date;

  @Expose()
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly amount: number;

  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly description?: string;
}
