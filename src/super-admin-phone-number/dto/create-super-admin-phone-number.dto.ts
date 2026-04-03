import { Expose } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSuperAdminPhoneNumberDto {
  @Expose()
  @IsNotEmpty()
  @IsString()
  readonly phoneNumber: string;

  @Expose()
  @IsNotEmpty()
  @IsString()
  readonly name: string;
}
