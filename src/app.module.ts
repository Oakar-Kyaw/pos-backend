import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { CompanyModule } from './company/company.module';
import { AuthModule } from './auth/auth.module';
import { CategoryModule } from './category/category.module';
import { ProductModule } from './product/product.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { PaymentDataModule } from './payment-data/payment-data.module';
import { PaymentModule } from './payment/payment.module';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IncomeModule } from './income/income.module';
import { SaleReportModule } from './sale-report/sale-report.module';
import { GeneralExpenseModule } from './general-expense/general-expense.module';
import { RefundModule } from './refund/refund.module';
import { AttendancesModule } from './attendances/attendances.module';

const redisUrl = new URL(process.env.REDIS_URL!);
const redisConnection = {
  host: redisUrl.hostname, // singapore-keyvalue.render.com
  port: Number(redisUrl.port) || 6379, // 6379
  password: redisUrl.password, // w5XSuG2cEcxLJAAWAbM0prIk2QazbYXc
  tls: redisUrl.protocol === 'rediss:' ? {} : undefined, // enable TLS if rediss://
};

@Module({
  imports: [
    UserModule,
    CompanyModule,
    AuthModule,
    CategoryModule,
    ProductModule,
    VouchersModule,
    PaymentDataModule,
    PaymentModule,
    //bull service
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL,
      },
      defaultJobOptions: {
        priority: 1, // Set default priority
        attempts: 3, // Retry 3 times if failed
        backoff: { type: 'exponential', delay: 5000 }, // Exponential backoff for retries
        removeOnComplete: true, // Remove the job when completed
        removeOnFail: true, // Remove the job when it fails// Set timeout for job execution
      },
    }),
    BullModule.registerQueue({ name: 'voucher-photos' }),
    IncomeModule,
    SaleReportModule,
    GeneralExpenseModule,
    RefundModule,
    AttendancesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
