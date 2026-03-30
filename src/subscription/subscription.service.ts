import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { PrismaService } from 'prisma/prisma.service';

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
