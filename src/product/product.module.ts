import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { FileUpload } from 'src/utils/file-upload';
import { PrismaModule } from 'prisma/prisma.module';
import { SocketGatewaysModule } from 'src/socket-gateways/socket-gateways.module';

@Module({
  imports: [PrismaModule, SocketGatewaysModule],
  controllers: [ProductController],
  providers: [ProductService, FileUpload],
})
export class ProductModule {}
