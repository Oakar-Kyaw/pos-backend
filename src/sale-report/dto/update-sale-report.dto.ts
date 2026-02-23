import { PartialType } from '@nestjs/mapped-types';
import { CreateSaleReportDto } from './create-sale-report.dto';

export class UpdateSaleReportDto extends PartialType(CreateSaleReportDto) {}
