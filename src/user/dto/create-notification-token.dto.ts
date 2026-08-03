import { Expose, Transform } from 'class-transformer';
import { IsString } from 'class-validator';

export class CreateNotificationDeviceTokenDto {
  @Expose()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly deviceToken: string;
}
