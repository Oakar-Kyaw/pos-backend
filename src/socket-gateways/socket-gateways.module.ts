import { Module } from '@nestjs/common';
import { SocketGatewaysService } from './socket.gateway';

@Module({
  providers: [SocketGatewaysService],
  exports: [SocketGatewaysService],
})
export class SocketGatewaysModule {}
