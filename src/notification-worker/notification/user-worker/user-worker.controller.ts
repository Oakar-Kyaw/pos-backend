import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { CustomerWorkerService } from './customer-worker.service';

@Controller()
export class UserWorkerController {
  constructor(private readonly customerService: CustomerWorkerService) {}

  @EventPattern('user_excel')
  async handleExcel(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('data ', data);

    try {
      await this.customerService.createCustomerWithExcel(data);
    } catch (error) {
      console.error('Failed to process excel:', error);
    }
  }
}
