import { Expose, Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCustomerDto {
  @Expose()
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  @Transform(({ value }) =>
    value !== undefined && value !== null ? String(value).trim() : value,
  )
  readonly name: string;

  @Expose()
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) =>
    value ? String(value).trim().toLowerCase() : value,
  )
  readonly email?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Transform(({ value }) =>
    value !== undefined && value !== null ? String(value).trim() : value,
  )
  readonly phone?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) =>
    value !== undefined && value !== null ? String(value).trim() : value,
  )
  readonly address?: string;

  @Expose()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  readonly branchId?: number;
}
