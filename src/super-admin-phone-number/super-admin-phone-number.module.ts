import { Module } from '@nestjs/common';
import { SuperAdminPhoneNumberService } from './super-admin-phone-number.service';
import { SuperAdminPhoneNumberController } from './super-admin-phone-number.controller';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [SuperAdminPhoneNumberController],
  providers: [SuperAdminPhoneNumberService, PrismaService],
})
export class SuperAdminPhoneNumberModule {}
