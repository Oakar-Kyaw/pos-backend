import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionPaymentController } from './subscription-payment.controller';
import { SubscriptionPaymentService } from './subscription-payment.service';

describe('SubscriptionPaymentController', () => {
  let controller: SubscriptionPaymentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionPaymentController],
      providers: [SubscriptionPaymentService],
    }).compile();

    controller = module.get<SubscriptionPaymentController>(SubscriptionPaymentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
