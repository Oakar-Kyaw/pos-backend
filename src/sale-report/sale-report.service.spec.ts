import { Test, TestingModule } from '@nestjs/testing';
import { SaleReportService } from './sale-report.service';

describe('SaleReportService', () => {
  let service: SaleReportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SaleReportService],
    }).compile();

    service = module.get<SaleReportService>(SaleReportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
