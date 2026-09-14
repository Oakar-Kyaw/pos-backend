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
    let subscriptionEndDate;
    let isTrial = false;

    // AuthGuard က user ကို populate မလုပ်သေးရင် (public route) skip
    if (!user?.companyId) {
      return true;
    }

    const checkCacheExist = await this.redisService.get(
      `${process.env['redis_subscription_key']}:${user.companyId}`,
    );
    const checkTrail = await this.redisService.get(
      `${process.env['redis_subscription_key']}:${user.companyId}:isTrail`,
    );

    if (checkCacheExist || checkTrail) {
      console.log('exist', checkCacheExist, checkTrail);
      subscriptionEndDate = checkCacheExist;
      isTrial = Boolean(checkTrail);
    } else {
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
      subscriptionEndDate = company.subscriptionEndDate;
      isTrial = company.isTrial;
      await this.redisService.set(
        `${process.env['redis_subscription_key']}:${user.companyId}`,
        subscriptionEndDate,
        3600,
      );
      await this.redisService.set(
        `${process.env['redis_subscription_key']}:${user.companyId}:isTrail`,
        company.isTrial,
        3600,
      );
    }
    console.log('trail period', subscriptionEndDate, isTrial);
    if (new Date(subscriptionEndDate) < new Date()) {
      throw new ForbiddenException(
        isTrial
          ? 'Your trial period has expired. Please subscribe to continue.'
          : 'Your subscription has expired. Please renew to continue.',
      );
    }

    return true;
  }
}
