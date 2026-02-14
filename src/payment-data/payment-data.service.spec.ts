import { Test, TestingModule } from '@nestjs/testing';
import { PaymentDataService } from './payment-data.service';

describe('PaymentDataService', () => {
  let service: PaymentDataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentDataService],
    }).compile();

    service = module.get<PaymentDataService>(PaymentDataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
