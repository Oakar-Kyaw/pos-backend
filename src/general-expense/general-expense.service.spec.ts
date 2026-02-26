import { Test, TestingModule } from '@nestjs/testing';
import { GeneralExpenseService } from './general-expense.service';

describe('GeneralExpenseService', () => {
  let service: GeneralExpenseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeneralExpenseService],
    }).compile();

    service = module.get<GeneralExpenseService>(GeneralExpenseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
