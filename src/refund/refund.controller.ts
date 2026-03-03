import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Query,
} from '@nestjs/common';
import { RefundService } from './refund.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { UpdateRefundDto } from './dto/update-refund.dto';

@Controller('api/v1/refunds')
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  // ================= CREATE =================
  @Post()
  async create(@Req() req, @Body() createRefundDto: CreateRefundDto) {
    const { id: userId, companyId, branchId } = req.user;

    return this.refundService.create(
      createRefundDto,
      userId,
      companyId,
      branchId,
    );
  }

  // ================= FIND ALL =================
  @Get()
  findAll(@Req() req, @Query('page') page = '1', @Query('limit') limit = '10') {
    const { id: userId, companyId, branchId } = req.user;

    return this.refundService.findAll(
      userId,
      companyId,
      branchId,
      +page,
      +limit,
    );
  }

  // ================= FIND ONE =================
  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    const { id: userId, companyId } = req.user;

    return this.refundService.findOne(+id, userId, companyId);
  }

  // ================= UPDATE =================
  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateRefundDto: UpdateRefundDto,
  ) {
    const { id: userId, companyId } = req.user;

    return this.refundService.update(+id, updateRefundDto, userId, companyId);
  }

  // ================= DELETE =================
  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    const { id: userId, companyId } = req.user;

    return this.refundService.remove(+id, userId, companyId);
  }
}
