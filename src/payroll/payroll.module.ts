import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { PrismaService } from 'prisma/prisma.service';
import { AttendancesModule } from 'src/attendances/attendances.module';

@Module({
  imports: [AttendancesModule],
  controllers: [PayrollController],
  providers: [PayrollService, PrismaService],
})
export class PayrollModule {}
