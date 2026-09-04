import { Expose, Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VoucherCustomerDto {
  @Expose()
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim().toLowerCase() : null))
  readonly name: string;

  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly phone?: string;
}
