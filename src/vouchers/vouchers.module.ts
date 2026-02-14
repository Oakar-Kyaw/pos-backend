import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { VouchersService } from './vouchers.service';
import { VouchersController } from './vouchers.controller';
import { PrismaService } from 'prisma/prisma.service';
import { FileUpload } from 'src/utils/file-upload';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { VoucherPhotoConsumer } from 'src/background/voucher-pic-background';
import { Queue } from 'bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'voucher-photos',
    }),
  ],
  controllers: [VouchersController],
  providers: [VouchersService, PrismaService, FileUpload, VoucherPhotoConsumer],
})
export class VouchersModule implements OnModuleInit {
  private readonly logger = new Logger(VouchersModule.name);

  constructor(
    @InjectQueue('voucher-photos') private readonly voucherQueue: Queue,
  ) {}

  async onModuleInit() {
    try {
      const isConnected = await (await this.voucherQueue.client).ping();
      this.logger.log(`✅ Redis connected! Ping response: ${isConnected}`);
    } catch (error) {
      this.logger.error('❌ Redis connection failed', error);
    }
  }
}
