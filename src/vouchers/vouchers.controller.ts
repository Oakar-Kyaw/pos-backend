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
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { VouchersService } from './vouchers.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/utils/multer-config';
import { CreateRepaymentDto } from './dto/create-repayment.dto';
import { isAdmin, isManager } from 'src/utils/check-user-role';

@Controller('api/v1/vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  // ================= CREATE =================
  @Post()
  @UseInterceptors(FilesInterceptor('files', 4, multerConfig))
  async create(
    @Req() req,
    @Body() createVoucherDto: CreateVoucherDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const { id: userId, companyId, branchId } = req.user;

    return this.vouchersService.create(
      createVoucherDto,
      userId,
      companyId,
      branchId,
      files,
    );
  }

  // ================= FIND ALL =================
  @Get()
  findAll(
    @Req() req,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
    @Query('existDebt') existDebt?: boolean,
    @Query('filterUserId') filterUserId?: number,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ) {
    const { id: userId, companyId, branchId, role } = req.user;
    //if not admin and manager , just see only his voucher
    let id = !(isAdmin(role) || isManager(role)) ? userId : undefined;
    //if filterUserId exist
    if (filterUserId) id = filterUserId;
    console.log('admin user is ', id, !isManager(role), startDate, endDate);
    return this.vouchersService.findAll(
      id,
      companyId,
      branchId,
      Number(page),
      Number(limit),
      search,
      existDebt ? existDebt : undefined,
      startDate,
      endDate,
    );
  }

  // ================= FIND ONE =================
  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    return this.vouchersService.findOne(+id);
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
    const { role } = req.user;

    return this.vouchersService.remove(+id, role);
  }

  @Post('repay')
  @UseInterceptors(FilesInterceptor('file', 1, multerConfig))
  createRepayment(
    @Req() req,
    @Body() createRepaymentDto: CreateRepaymentDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const { id: userId, companyId, branchId } = req.user;

    return this.vouchersService.createRepayment(
      createRepaymentDto,
      userId,
      companyId,
      branchId,
      files,
    );
  }

  @Get('repay/datas')
  findAllRepayment(
    @Req() req,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
    @Query('existDebt') existDebt?: boolean,
  ) {
    const { id: userId, companyId, branchId } = req.user;

    return this.vouchersService.findAllRepayment(
      userId,
      companyId,
      branchId,
      Number(page),
      Number(limit),
      search,
    );
  }
}
