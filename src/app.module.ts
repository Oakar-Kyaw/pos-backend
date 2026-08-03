import { Module } from '@nestjs/common';
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
import { BullModule } from '@nestjs/bullmq';
import { IncomeModule } from './income/income.module';
import { SaleReportModule } from './sale-report/sale-report.module';
import { GeneralExpenseModule } from './general-expense/general-expense.module';
import { RefundModule } from './refund/refund.module';
import { AttendancesModule } from './attendances/attendances.module';
import { HrRuleModule } from './hr-rule/hr-rule.module';
import { PayrollModule } from './payroll/payroll.module';
import { LeaveModule } from './leave/leave.module';
import { PlanModule } from './plan/plan.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { PlanFeatureModule } from './plan-feature/plan-feature.module';
import { SubscriptionPaymentModule } from './subscription-payment/subscription-payment.module';
import { SuperAdminPhoneNumberModule } from './super-admin-phone-number/super-admin-phone-number.module';
import { RedisModule } from './utils/redis/redis.module';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        priority: 1, // Set default priority
        attempts: 3, // Retry 3 times if failed
        backoff: { type: 'exponential', delay: 5000 }, // Exponential backoff for retries
        removeOnComplete: true, // Remove the job when completed
        removeOnFail: true, // Remove the job when it fails// Set timeout for job execution
      },
    }),
    IncomeModule,
    SaleReportModule,
    GeneralExpenseModule,
    RefundModule,
    AttendancesModule,
    HrRuleModule,
    PayrollModule,
    LeaveModule,
    PlanModule,
    SubscriptionModule,
    PlanFeatureModule,
    SubscriptionPaymentModule,
    SuperAdminPhoneNumberModule,
    RedisModule.forRoot(),
    RabbitMQModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
