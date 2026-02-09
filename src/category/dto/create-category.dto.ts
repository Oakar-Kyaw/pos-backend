import { Expose, Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';

export class CreateCategoryDto {
  @Expose()
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly title: string;
}
