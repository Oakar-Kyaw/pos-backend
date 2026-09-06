import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { ProductWorkerService } from './product-worker.service';

@Controller()
export class ProductWorkerController {
  constructor(private readonly productWorkerService: ProductWorkerService) {}

  @EventPattern('product_excel')
  async handleExcel(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    console.log('data ', data);

    try {
      await this.productWorkerService.createProductWithExcel(data);
      channel.ack(originalMsg); // success ဖြစ်ရင် ack
    } catch (error) {
      console.error('Failed to process excel:', error);
      channel.ack(originalMsg); // fail ဖြစ်လည်း ack (retry loop မဖြစ်အောင်)
      // channel.nack(originalMsg, false, false); ← DLQ ပို့ချင်ရင် ဒါကို သုံးပါ
    }
  }
}
