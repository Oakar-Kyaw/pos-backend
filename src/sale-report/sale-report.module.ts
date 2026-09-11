import { Module } from '@nestjs/common';
import { SaleReportService } from './sale-report.service';
import { SaleReportController } from './sale-report.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { IncomeModule } from 'src/income/income.module';

@Module({
  imports: [PrismaModule, IncomeModule],
  controllers: [SaleReportController],
  providers: [SaleReportService],
})
export class SaleReportModule {}
