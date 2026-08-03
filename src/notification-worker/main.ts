import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { NotificationModule } from './notification/notification.module';
import { ConfigModule } from '@nestjs/config';
import { NotificationWorkerModule } from './notification-worker.module';

async function bootstrap() {
  console.log('RABBITMQ_URL:', process.env.RABBITMQ_URL);
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    NotificationWorkerModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL ?? 'amqp://guest:guest@rabbitmq:5672'],
        queue: 'notification_queue',
        queueOptions: { durable: true },
        noAck: false,
        prefetchCount: 1,
      },
    },
  );
  await app.listen();
  console.log('🐰 Worker is listening for jobs...');
}
bootstrap();
