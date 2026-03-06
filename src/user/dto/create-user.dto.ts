import { Transform, Expose } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsDateString,
  IsInt,
  IsNumber,
  IsArray,
  IsBoolean,
} from 'class-validator';

export enum GenderEnum {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum EmployeeTypeEnum {
  MONTHLY = 'MONTHLY',
  HOURLY = 'HOURLY',
}

export class CreateUserDto {
  // -------- User Base --------

  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly firstName?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly lastName?: string;

  @Expose()
  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }) => (value ? String(value).trim().toLowerCase() : null))
  readonly email: string;

  @Expose()
  @IsOptional()
  @IsEnum(GenderEnum)
  @Transform(({ value }) =>
    value ? String(value).trim().toUpperCase() : 'MALE',
  )
  readonly gender?: GenderEnum;

  @Expose()
  @IsOptional()
  @IsString()
  @MinLength(6)
  @Transform(({ value }) => (value ? String(value).trim() : null))
  password?: string;

  @Expose()
  @IsOptional()
  readonly isSocialLogin?: boolean;

  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly phone?: string;

  @Expose()
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => {
    if (typeof value === 'string' && value) {
      const d = new Date(value);
      return new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
      )
        .toISOString()
        .replace(/\.\d{3}Z$/, 'Z');
    }
    return null;
  })
  readonly dateOfBirth?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  otp?: string;

  // -------- Employee Fields --------

  @Expose()
  @IsOptional()
  @IsEnum(EmployeeTypeEnum)
  @Transform(({ value }) =>
    value ? String(value).trim().toUpperCase() : 'MONTHLY',
  )
  employeeType?: EmployeeTypeEnum;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : null))
  monthlySalary?: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : null))
  hourlySalary?: number;

  @Expose()
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value ? Number(value) : null))
  branchId?: number;

  @Expose()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  holidays?: string[];

  @Expose()
  @IsOptional()
  @IsBoolean()
  locationRestrict: boolean;

  @Expose()
  @IsOptional()
  @IsString()
  startTime?: string;

  @Expose()
  @IsOptional()
  @IsString()
  endTime?: string;

  @Expose()
  @IsOptional()
  @IsString()
  address?: string;
}
