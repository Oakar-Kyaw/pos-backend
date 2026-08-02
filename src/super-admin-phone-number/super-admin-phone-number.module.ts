import { Module } from '@nestjs/common';
import { SuperAdminPhoneNumberService } from './super-admin-phone-number.service';
import { SuperAdminPhoneNumberController } from './super-admin-phone-number.controller';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SuperAdminPhoneNumberController],
  providers: [SuperAdminPhoneNumberService],
})
export class SuperAdminPhoneNumberModule {}
