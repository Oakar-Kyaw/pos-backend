import { Expose, Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateCompanyDto {
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
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim().toLowerCase() : null))
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
}
