import { Module } from '@nestjs/common';
import { AttendancesService } from './attendances.service';
import { AttendancesController } from './attendances.controller';
import { PrismaService } from 'prisma/prisma.service';
import { BullModule } from '@nestjs/bullmq';
import { CacheService } from 'src/cache-service/cache-service.service';
import { AttendanceTimeService } from './attendance-time-service';

@Module({
  controllers: [AttendancesController],
  providers: [
    AttendancesService,
    PrismaService,
    CacheService,
    AttendanceTimeService,
  ],
  exports: [AttendancesService],
})
export class AttendancesModule {}
