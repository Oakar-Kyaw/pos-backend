import { Test, TestingModule } from '@nestjs/testing';
import { SaleReportController } from './sale-report.controller';
import { SaleReportService } from './sale-report.service';

describe('SaleReportController', () => {
  let controller: SaleReportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SaleReportController],
      providers: [SaleReportService],
    }).compile();

    controller = module.get<SaleReportController>(SaleReportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
