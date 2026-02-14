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
import { VouchersService } from './vouchers.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';

@Controller('api/v1/vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  // ================= CREATE =================
  @Post()
  async create(@Req() req, @Body() createVoucherDto: CreateVoucherDto) {
    const { id: userId, companyId } = req.user;

    return this.vouchersService.create(createVoucherDto, userId, companyId);
  }

  // ================= FIND ALL =================
  @Get()
  findAll(
    @Req() req,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
  ) {
    const { id: userId, companyId } = req.user;

    return this.vouchersService.findAll(
      userId,
      companyId,
      Number(page),
      Number(limit),
      search,
    );
  }

  // ================= FIND ONE =================
  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    const { id: userId, companyId } = req.user;

    return this.vouchersService.findOne(+id, userId, companyId);
  }

  // ================= UPDATE =================
  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateVoucherDto: UpdateVoucherDto,
  ) {
    const { id: userId, companyId } = req.user;

    return this.vouchersService.update(
      +id,
      updateVoucherDto,
      userId,
      companyId,
    );
  }

  // ================= DELETE =================
  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    const { id: userId, companyId } = req.user;

    return this.vouchersService.remove(+id, userId, companyId);
  }
}
