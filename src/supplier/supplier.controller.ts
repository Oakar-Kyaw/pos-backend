import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';

import { SupplierService } from './supplier.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Controller('api/v1/suppliers')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post()
  create(@Req() req, @Body() createSupplierDto: CreateSupplierDto) {
    const { id: userId, companyId } = req.user;

    return this.supplierService.create(createSupplierDto, userId, companyId);
  }

  @Get()
  findAll(
    @Req() req,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
  ) {
    const { id: userId, companyId, branchId } = req.user;

    return this.supplierService.findAll(
      userId,
      companyId,
      branchId,
      Number(page),
      Number(limit),
      search,
    );
  }

  @Get('filter')
  findByfilter(
    @Req() req,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
  ) {
    const { id: userId, companyId, branchId } = req.user;
    //console.log('start and end is: ', supplierId, startDate, endDate);
    return this.supplierService.findByFilter(
      companyId,
      branchId,
      Number(page),
      Number(limit),
      search,
    );
  }

  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    const { id: userId, companyId, branchId } = req.user;

    return this.supplierService.findOne(+id, userId, companyId, branchId);
  }

  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    const { id: userId, companyId, branchId } = req.user;

    return this.supplierService.update(
      +id,
      updateSupplierDto,
      userId,
      companyId,
      branchId,
    );
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    const { id: userId, companyId, branchId, role } = req.user;
    if (role != 'ADMIN') throw new ForbiddenException('User is not Admin');
    return this.supplierService.remove(+id, userId, companyId, branchId);
  }
}
