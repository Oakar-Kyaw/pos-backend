import { Test, TestingModule } from '@nestjs/testing';
import { HrRuleController } from './hr-rule.controller';
import { HrRuleService } from './hr-rule.service';

describe('HrRuleController', () => {
  let controller: HrRuleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HrRuleController],
      providers: [HrRuleService],
    }).compile();

    controller = module.get<HrRuleController>(HrRuleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
