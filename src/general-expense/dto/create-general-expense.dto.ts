import { Expose, Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDate,
  IsNumber,
  Min,
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
} from 'class-validator';
import { CreateGeneralExpensePaymentDto } from './general-expense-payment.dto';

export class CreateGeneralExpenseDto {
  @Expose()
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => String(value).trim())
  readonly title: string;

  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly reason?: string;

  @Expose()
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  readonly amount: number;

  @Expose()
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  readonly date: Date;

  @Expose()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateGeneralExpensePaymentDto)
  readonly generalExpensePayment: CreateGeneralExpensePaymentDto[];
}
