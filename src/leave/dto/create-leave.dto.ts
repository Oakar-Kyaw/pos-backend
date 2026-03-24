import { Expose, Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { LeaveStatus } from '@prisma/client';

export class CreateLeaveDto {
  @Expose()
  @IsNotEmpty()
  @IsDateString()
  readonly date: string;

  @Expose()
  @IsNotEmpty()
  @IsInt()
  @Transform(({ value }) => Number(value))
  readonly userId: number;

  @Expose()
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value ? Number(value) : null))
  readonly approvedId?: number;

  @Expose()
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => String(value).trim())
  readonly title: string;

  @Expose()
  @IsOptional()
  @IsEnum(LeaveStatus)
  readonly status?: LeaveStatus;
}
