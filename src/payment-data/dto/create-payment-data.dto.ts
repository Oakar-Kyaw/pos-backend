import { Expose } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { AccountType } from '@prisma/client';

export class CreatePaymentDataDto {
  @Expose()
  @IsNotEmpty()
  @IsString()
  readonly accountName: string; // Owner / account holder name

  @Expose()
  @IsOptional()
  @IsString()
  readonly accountNumber?: string; // Optional for cash

  @Expose()
  @IsNotEmpty()
  @IsNumber()
  readonly balance: number;

  @Expose()
  @IsNotEmpty()
  @IsEnum(AccountType)
  readonly accountType: AccountType; // CASH | BANK | CARD | EWALLET

  // ===== Status =====
  @Expose()
  @IsOptional()
  @IsBoolean()
  readonly isActive?: boolean;
}
