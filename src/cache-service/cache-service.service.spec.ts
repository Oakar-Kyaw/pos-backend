import { Test, TestingModule } from '@nestjs/testing';
import { CacheServiceService } from './cache-service.service';

describe('CacheServiceService', () => {
  let service: CacheServiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CacheServiceService],
    }).compile();

    service = module.get<CacheServiceService>(CacheServiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
