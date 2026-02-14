import { Expose, Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  ValidateNested,
  IsArray,
  Min,
} from 'class-validator';
import { CreateVoucherItemDto } from './create-voucher-item.dto';
import { VoucherType } from '@prisma/client';

export class CreateVoucherDto {
  // ===== Basic Info =====

  @Expose()
  @IsNotEmpty()
  @IsString()
  readonly type: VoucherType;

  @Expose()
  @IsOptional()
  @IsString()
  readonly note?: string;

  // ===== Amounts =====

  @Expose()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly subTotal?: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly tax?: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly total?: number;

  // ===== Items =====

  @Expose()
  @IsArray()
  @Type(() => CreateVoucherItemDto)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return [];
      }
    }
    return value;
  })
  readonly items: CreateVoucherItemDto[];
}
