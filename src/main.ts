import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuthGuard } from './auth/auth.guard';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Global Validation + Transform
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove unknown fields
      forbidNonWhitelisted: true, // throw error if extra fields sent
      transform: true, // auto transform types
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ✅ Global Auth Guard
  app.useGlobalGuards(app.get(AuthGuard));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
