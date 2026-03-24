import { Module } from '@nestjs/common';
import { PlanFeatureService } from './plan-feature.service';
import { PlanFeatureController } from './plan-feature.controller';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [PlanFeatureController],
  providers: [PlanFeatureService, PrismaService],
})
export class PlanFeatureModule {}
