import { PayrollStatus } from '@prisma/client';
import { Expose, Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreatePayrollDto {
  @Expose()
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  readonly userId: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly bonus?: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly deduction?: number;

  // Status / Note
  @Expose()
  @IsOptional()
  @IsEnum(PayrollStatus)
  readonly status?: PayrollStatus;

  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly note?: string;

  @Expose()
  @IsNotEmpty()
  @IsDate()
  readonly date: Date;
}
