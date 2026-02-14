import { Expose } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { AccountType } from '@prisma/client';

export class CreatePaymentDataDto {
  // ===== Basic Info =====
  @Expose()
  @IsNotEmpty()
  @IsString()
  readonly name: string; // Display name, e.g., "ABA Bank", "Cash Drawer"

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
  @IsEnum(AccountType)
  readonly accountType: AccountType; // CASH | BANK | CARD | EWALLET

  // ===== Status =====
  @Expose()
  @IsOptional()
  @IsBoolean()
  readonly isActive?: boolean;
}
