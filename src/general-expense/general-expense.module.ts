import { Module } from '@nestjs/common';
import { GeneralExpenseService } from './general-expense.service';
import { GeneralExpenseController } from './general-expense.controller';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [GeneralExpenseController],
  providers: [GeneralExpenseService, PrismaService],
})
export class GeneralExpenseModule {}
