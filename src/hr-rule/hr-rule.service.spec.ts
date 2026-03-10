import { Test, TestingModule } from '@nestjs/testing';
import { HrRuleService } from './hr-rule.service';

describe('HrRuleService', () => {
  let service: HrRuleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HrRuleService],
    }).compile();

    service = module.get<HrRuleService>(HrRuleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
