import { Module } from '@nestjs/common';
import { GeneralExpenseService } from './general-expense.service';
import { GeneralExpenseController } from './general-expense.controller';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GeneralExpenseController],
  providers: [GeneralExpenseService],
})
export class GeneralExpenseModule {}
