import { PartialType } from '@nestjs/mapped-types';
import { CreateSuperAdminPhoneNumberDto } from './create-super-admin-phone-number.dto';

export class UpdateSuperAdminPhoneNumberDto extends PartialType(CreateSuperAdminPhoneNumberDto) {}
