import { Test, TestingModule } from '@nestjs/testing';
import { SuperAdminPhoneNumberService } from './super-admin-phone-number.service';

describe('SuperAdminPhoneNumberService', () => {
  let service: SuperAdminPhoneNumberService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SuperAdminPhoneNumberService],
    }).compile();

    service = module.get<SuperAdminPhoneNumberService>(SuperAdminPhoneNumberService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
