import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { NotificationWorkerModule } from './notification-worker.module';

async function bootstrap() {
  const workerType = process.env.WORKER_TYPE;

  let queue: string;

  if (workerType === 'product') {
    queue = 'product_queue';
  } else if (workerType === 'notification') {
    queue = 'notification_queue';
  } else {
    throw new Error('WORKER_TYPE must be "product" or "notification"');
  }

  console.log(`🐰 Starting ${workerType} worker`);
  console.log(`📬 Queue: ${queue}`);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    NotificationWorkerModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL ?? 'amqp://guest:guest@rabbitmq:5672'],
        queue,
        queueOptions: {
          durable: true,
        },
        noAck: false,
        prefetchCount: 1,
      },
    },
  );

  await app.listen();

  console.log(`🐰 ${workerType} worker is listening...`);
}

bootstrap();
