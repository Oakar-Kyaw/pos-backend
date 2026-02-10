import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { PrismaService } from 'prisma/prisma.service';
import { FileUpload } from 'src/utils/file-upload';

@Module({
  controllers: [ProductController],
  providers: [ProductService, PrismaService, FileUpload],
})
export class ProductModule {}
