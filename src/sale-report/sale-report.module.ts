import { Module } from '@nestjs/common';
import { SaleReportService } from './sale-report.service';
import { SaleReportController } from './sale-report.controller';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [SaleReportController],
  providers: [SaleReportService, PrismaService],
})
export class SaleReportModule {}
