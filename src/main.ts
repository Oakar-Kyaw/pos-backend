// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import { AuthGuard } from './auth/auth.guard';
// import { ValidationPipe } from '@nestjs/common';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);

//   // Global Validation + Transform
//   app.useGlobalPipes(
//     new ValidationPipe({
//       whitelist: true, // remove unknown fields
//       forbidNonWhitelisted: true, // throw error if extra fields sent
//       transform: true, // auto transform types
//       // transformOptions: {
//       //   enableImplicitConversion: true,
//       // },
//     }),
//   );

//   // Global Auth Guard
//   app.useGlobalGuards(app.get(AuthGuard));
//   // setInterval(() => {
//   //   const mem = process.memoryUsage();

//   //   console.log({
//   //     rss: `${(mem.rss / 1024 / 1024).toFixed(2)} MB`,
//   //     heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`,
//   //   });
//   // }, 5000);

//   await app.listen(process.env.PORT ?? 3000);
// }
// bootstrap();
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { AuthGuard } from './auth/auth.guard';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global Validation + Transform
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global Auth Guard
  app.useGlobalGuards(app.get(AuthGuard));

  // RabbitMQ microservice listener ချိတ်ပါ (import_progress event လက်ခံဖို့)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL ?? 'amqp://guest:guest@rabbitmq:5672'],
      queue: 'notification_queue', // worker ကနေ ပို့တဲ့ queue name နဲ့ တူရမယ်
      queueOptions: { durable: true },
    },
  });

  await app.startAllMicroservices(); // RabbitMQ listener ကို start
  await app.listen(process.env.PORT ?? 3000); // HTTP + Socket.IO server ကို start
}
bootstrap();
