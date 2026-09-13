// subscription-guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'prisma/prisma.service';
import { RedisService } from 'src/utils/redis/redis.service';
import { SKIP_SUBSCRIPTION_CHECK } from 'src/utils/skip-subscription';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_SUBSCRIPTION_CHECK,
      [context.getHandler(), context.getClass()],
    );
    if (skip) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // AuthGuard က user ကို populate မလုပ်သေးရင် (public route) skip
    if (!user?.companyId) {
      return true;
    }

    const company = await this.prisma.company.findUnique({
      where: { id: user.companyId },
      select: { id: true, isTrial: true, subscriptionEndDate: true },
    });

    if (!company) {
      throw new ForbiddenException('Company not found');
    }

    if (!company.subscriptionEndDate) {
      throw new ForbiddenException(
        'No active subscription found. Please subscribe to continue.',
      );
    }

    if (company.subscriptionEndDate < new Date()) {
      throw new ForbiddenException(
        company.isTrial
          ? 'Your trial period has expired. Please subscribe to continue.'
          : 'Your subscription has expired. Please renew to continue.',
      );
    }

    return true;
  }
}
