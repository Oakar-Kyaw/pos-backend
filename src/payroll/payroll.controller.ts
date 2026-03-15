import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { CalculatePayrollDto } from './dto/calculate-payroll.dto';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { UpdatePayrollDto } from './dto/update-payroll.dto';

@Controller('api/v1/payrolls')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  // ================= CREATE =================
  @Post()
  create(@Req() req, @Body() dto: CreatePayrollDto) {
    const { id: userId, companyId, branchId } = req.user;
    return this.payrollService.create(dto, userId, companyId, branchId);
  }

  // ================= FIND ALL =================
  @Get()
  findAll(
    @Req() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('userId') userId?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('branchId') branchId?: string,
  ) {
    const { id: requesterId, companyId } = req.user;
    return this.payrollService.findAll(
      requesterId,
      companyId,
      branchId ? +branchId : undefined,
      page,
      limit,
      userId ? +userId : undefined,
      month ? +month : undefined,
      year ? +year : undefined,
    );
  }

  // ================= FIND ONE =================
  @Get(':id')
  findOne(@Req() req, @Param('id', ParseIntPipe) id: number) {
    const { id: userId, companyId } = req.user;
    return this.payrollService.findOne(id, userId, companyId);
  }

  // ================= UPDATE =================
  @Patch(':id')
  update(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePayrollDto,
  ) {
    const { id: userId, companyId } = req.user;
    return this.payrollService.update(id, dto, userId, companyId);
  }

  // ================= DELETE =================
  @Delete(':id')
  remove(@Req() req, @Param('id', ParseIntPipe) id: number) {
    const { id: userId, companyId } = req.user;
    return this.payrollService.remove(id, userId, companyId);
  }

  @Post('calculate')
  calculate(@Req() req, @Body() dto: CalculatePayrollDto) {
    const { id: userId, companyId, branchId } = req.user;
    return this.payrollService.calculate(dto, { userId, companyId, branchId });
  }
}
