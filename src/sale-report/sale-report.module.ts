import { Module } from '@nestjs/common';
import { SaleReportService } from './sale-report.service';
import { SaleReportController } from './sale-report.controller';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SaleReportController],
  providers: [SaleReportService],
})
export class SaleReportModule {}
