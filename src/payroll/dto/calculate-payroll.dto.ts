import { Expose, Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CalculatePayrollDto {
  @Expose()
  @IsNotEmpty()
  @IsDate()
  readonly date: Date;

  @Expose()
  @IsNotEmpty()
  @IsNumber()
  readonly userId: number;
}
