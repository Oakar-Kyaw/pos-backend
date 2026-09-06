import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { ProductWorkerService } from './product-worker.service';

@Controller()
export class ProductWorkerController {
  constructor(private readonly productWorkerService: ProductWorkerService) {}

  @EventPattern('product_excel')
  async handleExcel(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('data ', data);

    try {
      await this.productWorkerService.createProductWithExcel(data);
    } catch (error) {
      console.error('Failed to process excel:', error);
    }
  }
}
