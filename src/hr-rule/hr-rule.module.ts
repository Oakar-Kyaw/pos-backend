import { Module } from '@nestjs/common';
import { HrRuleService } from './hr-rule.service';
import { HrRulesController } from './hr-rule.controller';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [HrRulesController],
  providers: [HrRuleService, PrismaService],
})
export class HrRuleModule {}
