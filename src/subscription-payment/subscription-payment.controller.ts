import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SubscriptionPaymentService } from './subscription-payment.service';
import { CreateSubscriptionPaymentDto } from './dto/create-subscription-payment.dto';
import { UpdateSubscriptionPaymentDto } from './dto/update-subscription-payment.dto';

@Controller('subscription-payment')
export class SubscriptionPaymentController {
  constructor(private readonly subscriptionPaymentService: SubscriptionPaymentService) {}

  @Post()
  create(@Body() createSubscriptionPaymentDto: CreateSubscriptionPaymentDto) {
    return this.subscriptionPaymentService.create(createSubscriptionPaymentDto);
  }

  @Get()
  findAll() {
    return this.subscriptionPaymentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subscriptionPaymentService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSubscriptionPaymentDto: UpdateSubscriptionPaymentDto) {
    return this.subscriptionPaymentService.update(+id, updateSubscriptionPaymentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.subscriptionPaymentService.remove(+id);
  }
}
