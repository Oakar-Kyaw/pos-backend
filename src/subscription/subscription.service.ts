import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { PrismaService } from 'prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}
  async create(
    createSubscriptionDto: CreateSubscriptionDto,
    userId: number,
    companyId: number,
    imageUrl?: string,
  ) {
    const { planId, endDate } = createSubscriptionDto;

    // 🔹 validate plan
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // 🔹 prevent duplicate subscription
    const existing = await this.prisma.subscription.findFirst({
      where: {
        userId,
        isActive: true,
        isDeleted: false,
      },
    });

    if (existing) {
      throw new BadRequestException('User already has an active subscription');
    }

    //  TRANSACTION START
    const result = await this.prisma.$transaction(async (tx) => {
      // 1️ create subscription
      const subscription = await tx.subscription.create({
        data: {
          userId,
          companyId,
          planId,
          endDate: new Date(endDate),
          isActive: true,
        },
      });

      // 2️ create payment
      const payment = await tx.subscriptionPayment.create({
        data: {
          amount: createSubscriptionDto.amount ?? 0, // assume plan has price
          userId,
          companyId,
          type: createSubscriptionDto.type,
          subscriptionId: subscription.id,
          imageUrl,
        },
      });

      return {
        subscription,
        payment,
      };
    });

    return {
      success: true,
      data: result,
      message: 'Subscription & Payment created successfully',
    };
  }

  findAll() {
    return `This action returns all subscription`;
  }

  async findCompanyCurrentSubscription({ companyId }: { companyId: number }) {
    let data: { planName: string; usdAmount: Decimal; mmkAmount: Decimal };
    const checkCompanySubcription = await this.prisma.subscription.findMany({
      where: {
        companyId,
      },
      orderBy: {
        endDate: 'desc',
      },
      include: {
        plan: true,
      },
    });
    let isTrail = await this.prisma.company.findUnique({
      where: {
        id: companyId,
        isTrial: true,
      },
    });

    if (isTrail && checkCompanySubcription.length === 0) {
      data = {
        planName: '14 day trial subscription plan',
        usdAmount: Prisma.Decimal(0.0),
        mmkAmount: Prisma.Decimal(0.0),
      };
    } else {
      data = {
        planName: checkCompanySubcription[0].plan.name,
        usdAmount: checkCompanySubcription[0].plan.priceUSD,
        mmkAmount: checkCompanySubcription[0].plan.priceMMK,
      };
    }

    return {
      success: true,
      data,
      message: 'Company Current Subscription',
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} subscription`;
  }

  update(id: number, updateSubscriptionDto: UpdateSubscriptionDto) {
    return `This action updates a #${id} subscription`;
  }

  remove(id: number) {
    return `This action removes a #${id} subscription`;
  }
}
