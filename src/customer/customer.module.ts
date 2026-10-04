import { Module } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { SocketGatewaysModule } from 'src/socket-gateways/socket-gateways.module';
import { FileUpload } from 'src/utils/file-upload';

@Module({
  imports: [SocketGatewaysModule],
  controllers: [CustomerController],
  providers: [CustomerService, FileUpload],
})
export class CustomerModule {}
