import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { AttendancesModule } from 'src/attendances/attendances.module';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [AttendancesModule, PrismaModule],
  controllers: [PayrollController],
  providers: [PayrollService],
})
export class PayrollModule {}
