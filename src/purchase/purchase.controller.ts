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

import { PurchaseService } from './purchase.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';

@Controller('api/v1/purchases')
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Post()
  create(@Req() req, @Body() createPurchaseDto: CreatePurchaseDto) {
    const { id: userId, companyId, branchId } = req.user;

    return this.purchaseService.create(
      createPurchaseDto,
      userId,
      companyId,
      branchId,
    );
  }

  @Get()
  findAll(
    @Req() req,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
    @Query('supplierId') supplierId?: number,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ) {
    const { id: userId, companyId, branchId } = req.user;
    console.log('start and end is: ', supplierId, startDate, endDate);
    return this.purchaseService.findAll(
      companyId,
      branchId,
      Number(page),
      Number(limit),
      // search,
      // supplierId,
    );
  }

  @Get('filter')
  findByfilter(
    @Req() req,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
    @Query('supplierId') supplierId?: number,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ) {
    const { id: userId, companyId, branchId } = req.user;
    //console.log('start and end is: ', supplierId, startDate, endDate);
    return this.purchaseService.findByFilter(
      companyId,
      branchId,
      Number(page),
      Number(limit),
      search,
      supplierId,
      startDate,
      endDate,
    );
  }

  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    const { id: userId, companyId, branchId } = req.user;

    return this.purchaseService.findOne(+id, userId, companyId, branchId);
  }

  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() updatePurchaseDto: UpdatePurchaseDto,
  ) {
    const { id: userId, companyId, branchId } = req.user;

    return this.purchaseService.update(
      +id,
      updatePurchaseDto,
      userId,
      companyId,
      branchId,
    );
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    const { id: userId, companyId, branchId, role } = req.user;
    if (role != 'ADMIN') throw new ForbiddenException('User is not Admin');
    return this.purchaseService.remove(+id, userId, companyId, branchId);
  }

  @Patch('/confirm/:id')
  updateConfirm(@Req() req, @Param('id') id: string) {
    const { id: userId, companyId, branchId } = req.user;

    return this.purchaseService.updateSuccess(+id);
  }
}
