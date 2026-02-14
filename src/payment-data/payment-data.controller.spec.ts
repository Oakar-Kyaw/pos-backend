import { Test, TestingModule } from '@nestjs/testing';
import { PaymentDataController } from './payment-data.controller';
import { PaymentDataService } from './payment-data.service';

describe('PaymentDataController', () => {
  let controller: PaymentDataController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentDataController],
      providers: [PaymentDataService],
    }).compile();

    controller = module.get<PaymentDataController>(PaymentDataController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
