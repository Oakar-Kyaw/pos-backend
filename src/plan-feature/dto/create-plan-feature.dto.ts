import { Expose, Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsInt, IsOptional } from 'class-validator';

export class CreatePlanFeatureDto {
  @Expose()
  @IsOptional()
  @IsInt()
  readonly planId?: number;

  @Expose()
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => String(value).trim())
  readonly icon: string;

  @Expose()
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => String(value).trim())
  readonly key: string;

  @Expose()
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => String(value).trim())
  readonly value: string;
}
