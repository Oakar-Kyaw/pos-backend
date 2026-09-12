import { Expose, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { CompanyType } from '@prisma/client'; // Prisma-generated enum

export class CreateCompanyDto {
  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly country?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly code?: string;

  @Expose()
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly name: string;

  @Expose()
  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }) => (value ? String(value).trim().toLowerCase() : null))
  readonly email: string;

  @Expose()
  @IsOptional()
  @IsString()
  password: string;

  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly phone?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly address?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly photoUrl?: string;

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
  @IsEnum(CompanyType)
  readonly type?: CompanyType;

  @Expose()
  @IsOptional()
  @IsBoolean()
  readonly isTrial?: boolean;
}
