import { Test, TestingModule } from '@nestjs/testing';
import { GeneralExpenseController } from './general-expense.controller';
import { GeneralExpenseService } from './general-expense.service';

describe('GeneralExpenseController', () => {
  let controller: GeneralExpenseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeneralExpenseController],
      providers: [GeneralExpenseService],
    }).compile();

    controller = module.get<GeneralExpenseController>(GeneralExpenseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
