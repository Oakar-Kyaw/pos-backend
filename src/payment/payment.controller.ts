import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Controller('api/v1/payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ================= CREATE =================
  @Post()
  async create(@Req() req, @Body() dto: CreatePaymentDto) {
    const { id: userId, companyId } = req.user;
    return this.paymentService.create(dto, userId, companyId);
  }

  // ================= FIND ALL =================
  @Get()
  findAll(@Req() req) {
    const { id: userId, companyId } = req.user;
    return this.paymentService.findAll(userId, companyId);
  }

  // ================= FIND ONE =================
  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    const { id: userId, companyId } = req.user;
    return this.paymentService.findOne(+id, userId, companyId);
  }

  // ================= UPDATE =================
  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    const { id: userId, companyId } = req.user;
    return this.paymentService.update(+id, dto, userId, companyId);
  }

  // ================= DELETE =================
  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    const { id: userId, companyId } = req.user;
    return this.paymentService.remove(+id, userId, companyId);
  }
}
