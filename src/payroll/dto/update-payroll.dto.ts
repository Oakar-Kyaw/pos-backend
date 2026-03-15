import { Expose, Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PayrollStatus } from '@prisma/client';

export class UpdatePayrollDto {
  // Salary breakdown
  @Expose()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly baseSalary?: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly lateDeduction?: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly earlyLeaveDeduction?: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly overtime?: number;

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

  @Expose()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly leaveDeduction?: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly netSalary?: number;

  // Summary counts
  @Expose()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  readonly totalWorkingDays?: number;

  @Expose()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  readonly presentDays?: number;

  @Expose()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  readonly absentDays?: number;

  @Expose()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  readonly halfDays?: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly leaveDays?: number;

  @Expose()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  readonly lateTotalMinutes?: number;

  @Expose()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  readonly earlyLeaveTotalMinutes?: number;

  @Expose()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  readonly overtimeTotalMinutes?: number;

  @Expose()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  readonly overtimeDays?: number;

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
}
