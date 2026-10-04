import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { RabbitMQModule } from 'src/rabbitmq/rabbitmq.module';
import { CustomerWorkerService } from './customer-worker.service';
import { UserWorkerController } from './user-worker.controller';

@Module({
  imports: [PrismaModule, RabbitMQModule],
  controllers: [UserWorkerController],
  providers: [CustomerWorkerService],
})
export class UserWorkerModule {}
