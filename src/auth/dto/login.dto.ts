import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

// ----------- Request DTO -----------
export class LoginDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  deviceToken?: string;

  //   @IsOptional()
  //   @ApiProperty({
  //     example: { deviceType: 'ios', deviceName: 'iPhone 13' },
  //     required: false,
  //   })
  //   deviceInfo?: any;
}
