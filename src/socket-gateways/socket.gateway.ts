import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'socket',
})
export class SocketGatewaysService
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SocketGatewaysService.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id} ${client}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  handleJoin(client: Socket, payload: { userId: number }) {
    const room = `user_${payload.userId}`;

    client.join(room);

    // Remember which user owns this socket
    client.data.userId = payload.userId;

    this.logger.log(`User ${payload.userId} joined ${room}`);
  }

  @SubscribeMessage('send_progress')
  handleSendMessage(
    client: Socket,
    payload: {
      receiverId: number;
      message: string;
      progress: string;
    },
  ) {
    console.log('receiverId:', payload.receiverId);
    console.log('message:', payload.message);
    console.log('message:', payload.progress);
    this.server.to(`user_${payload.receiverId}`).emit('send_progress', {
      receiverId: payload.receiverId,
      message: payload.message,
      progress: payload.progress,
    });
  }

  emitProgress(
    userId: number,
    data: { percent: number; processed: number; total: number },
  ) {
    this.server.to(`user_${userId}`).emit('send_progress', data);
  }
}
