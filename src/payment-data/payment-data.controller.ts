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
import { PaymentDataService } from './payment-data.service';
import { CreatePaymentDataDto } from './dto/create-payment-data.dto';
import { UpdatePaymentDataDto } from './dto/update-payment-data.dto';

@Controller('api/v1/payment-data')
export class PaymentDataController {
  constructor(private readonly paymentDataService: PaymentDataService) {}

  // ================= CREATE =================
  @Post()
  async create(@Req() req, @Body() createPaymentDataDto: CreatePaymentDataDto) {
    const { id: userId, companyId } = req.user;

    return this.paymentDataService.create(
      createPaymentDataDto,
      userId,
      companyId,
    );
  }

  // ================= FIND ALL =================
  @Get()
  findAll(@Req() req) {
    const { id: userId, companyId } = req.user;

    return this.paymentDataService.findAll(userId, companyId);
  }

  // ================= FIND ONE =================
  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    const { id: userId, companyId } = req.user;

    return this.paymentDataService.findOne(+id, userId, companyId);
  }

  // ================= UPDATE =================
  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() updatePaymentDataDto: UpdatePaymentDataDto,
  ) {
    const { id: userId, companyId } = req.user;

    return this.paymentDataService.update(
      +id,
      updatePaymentDataDto,
      userId,
      companyId,
    );
  }

  // ================= DELETE =================
  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    const { id: userId, companyId } = req.user;

    return this.paymentDataService.remove(+id, userId, companyId);
  }
}
