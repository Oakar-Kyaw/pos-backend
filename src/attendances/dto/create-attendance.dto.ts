import { Expose, Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  IsDateString,
  IsEnum,
  IsNumber,
  IsDate,
} from 'class-validator';
import { AttendanceStatus, OvertimeType } from '@prisma/client';

export class CreateAttendanceDto {
  @Expose()
  @IsNotEmpty()
  @IsDate()
  readonly date: Date;

  @Expose()
  @IsOptional()
  @IsInt()
  readonly userId: number;

  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly checkIn?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly checkOut?: string;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : null))
  readonly workingMinutes?: number;

  @Expose()
  @IsOptional()
  @IsEnum(AttendanceStatus)
  readonly status?: AttendanceStatus;

  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly note?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly lat?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly long?: string;

  @Expose()
  @IsOptional()
  @IsInt()
  readonly overtimeMinutes: number;

  @Expose()
  @IsOptional()
  @IsEnum(OvertimeType)
  readonly overtimeType?: OvertimeType;
}
