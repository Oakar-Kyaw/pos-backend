import { Test, TestingModule } from '@nestjs/testing';
import { SuperAdminPhoneNumberController } from './super-admin-phone-number.controller';
import { SuperAdminPhoneNumberService } from './super-admin-phone-number.service';

describe('SuperAdminPhoneNumberController', () => {
  let controller: SuperAdminPhoneNumberController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuperAdminPhoneNumberController],
      providers: [SuperAdminPhoneNumberService],
    }).compile();

    controller = module.get<SuperAdminPhoneNumberController>(SuperAdminPhoneNumberController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
