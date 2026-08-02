import { Module } from '@nestjs/common';
import { PlanFeatureService } from './plan-feature.service';
import { PlanFeatureController } from './plan-feature.controller';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PlanFeatureController],
  providers: [PlanFeatureService],
})
export class PlanFeatureModule {}
