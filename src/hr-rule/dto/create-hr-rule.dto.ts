import { Expose, Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsInt, IsEnum } from 'class-validator';
import { HrRuleType } from '@prisma/client';

export class CreateHrRuleDto {
  @Expose()
  @IsOptional()
  @IsEnum(HrRuleType)
  readonly type?: HrRuleType;

  @Expose()
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value !== undefined ? Number(value) : null))
  readonly thresholdMinute?: number;

  @Expose()
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value !== undefined ? Number(value) : null))
  readonly thresholdAmount?: number;

  @Expose()
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value !== undefined ? Number(value) : null))
  readonly thresholdAmountPercent?: number;

  @Expose()
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value !== undefined ? Number(value) : null))
  readonly thresholdDays?: number;
}
