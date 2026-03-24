import { Module } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { LeaveController } from './leave.controller';
import { PrismaService } from 'prisma/prisma.service';
import { FileUpload } from 'src/utils/file-upload';

@Module({
  controllers: [LeaveController],
  providers: [LeaveService, PrismaService, FileUpload],
})
export class LeaveModule {}
