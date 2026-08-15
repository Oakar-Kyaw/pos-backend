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

import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('api/v1/customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  create(@Req() req, @Body() createCustomerDto: CreateCustomerDto) {
    const { id: userId, companyId } = req.user;

    return this.customerService.create(createCustomerDto, userId, companyId);
  }

  @Get()
  findAll(
    @Req() req,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
  ) {
    const { id: userId, companyId, branchId } = req.user;

    return this.customerService.findAll(
      userId,
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

    return this.customerService.findOne(+id, userId, companyId, branchId);
  }

  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    const { id: userId, companyId, branchId } = req.user;

    return this.customerService.update(
      +id,
      updateCustomerDto,
      userId,
      companyId,
      branchId,
    );
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    const { id: userId, companyId, branchId, role } = req.user;
    if (role != 'ADMIN') throw new ForbiddenException('User is not Admin');
    return this.customerService.remove(+id, userId, companyId, branchId);
  }
}
