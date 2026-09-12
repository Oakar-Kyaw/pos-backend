import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { FileUpload } from 'src/utils/file-upload';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyController],
  providers: [CompanyService, FileUpload],
})
export class CompanyModule {}
