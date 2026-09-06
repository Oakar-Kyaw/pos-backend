import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'prisma/prisma.module';
import { ProductWorkerController } from './product-worker.controller';
import { ProductWorkerService } from './product-worker.service';
import { RabbitMQModule } from 'src/rabbitmq/rabbitmq.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RabbitMQModule,
  ],
  controllers: [ProductWorkerController],
  providers: [ProductWorkerService],
})
export class ProductWorkerModule {}
