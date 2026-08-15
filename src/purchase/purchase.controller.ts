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
  ) {
    const { id: userId, companyId, branchId } = req.user;

    return this.purchaseService.findAll(
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
}
