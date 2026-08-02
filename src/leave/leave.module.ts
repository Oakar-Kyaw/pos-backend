import { Module } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { LeaveController } from './leave.controller';
import { FileUpload } from 'src/utils/file-upload';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LeaveController],
  providers: [LeaveService, FileUpload],
})
export class LeaveModule {}
