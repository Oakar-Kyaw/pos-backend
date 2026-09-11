import { TransferType } from '@prisma/client';
import { Expose, Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsDate,
  IsNumber,
  IsInt,
  IsPositive,
  IsEnum,
} from 'class-validator';

export class CreateTransferDto {
  @Expose()
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  readonly date: Date;

  @Expose()
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @IsPositive()
  readonly amount: number;

  @Expose()
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  readonly from: number;

  @Expose()
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  readonly to: number;

  @Expose()
  @IsEnum(TransferType)
  @Transform(({ value }) =>
    value ? String(value).trim().toUpperCase() : 'INTERNAL',
  )
  transferType: TransferType;
}
