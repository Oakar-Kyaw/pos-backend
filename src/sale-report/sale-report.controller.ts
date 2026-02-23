import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  DefaultValuePipe,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { SaleReportService } from './sale-report.service';
import { CreateSaleReportDto } from './dto/create-sale-report.dto';
import { UpdateSaleReportDto } from './dto/update-sale-report.dto';

@Controller('api/v1/sale-reports')
export class SaleReportController {
  constructor(private readonly saleReportService: SaleReportService) {}

  @Post()
  create(@Req() req, @Body() createSaleReportDto: CreateSaleReportDto) {
    const { id: userId, companyId, branchId } = req.user;
    return this.saleReportService.create(
      createSaleReportDto,
      userId,
      companyId,
      branchId,
    );
  }

  @Get()
  findAll(
    @Req() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { userId, companyId, branchId } = req.user;

    return this.saleReportService.findAll(
      userId,
      companyId,
      branchId,
      page,
      limit,
      startDate,
      endDate,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.saleReportService.findOne(id);
  }

  @Get('opening/amount')
  getOpeningAndClosing(@Query('date') date: string) {
    return this.saleReportService.getOpeningAndClosing(date);
  }

  @Patch(':id')
  update(
    @Param('id') id: number,
    @Body() updateSaleReportDto: UpdateSaleReportDto,
  ) {
    return this.saleReportService.update(id, updateSaleReportDto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.saleReportService.remove(id);
  }
}
