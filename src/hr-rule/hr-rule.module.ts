import { Module } from '@nestjs/common';
import { HrRuleService } from './hr-rule.service';
import { HrRulesController } from './hr-rule.controller';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HrRulesController],
  providers: [HrRuleService],
})
export class HrRuleModule {}
