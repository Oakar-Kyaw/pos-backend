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

    if (!user?.companyId) {
      return true;
    }

    const subscriptionKey = `${process.env['redis_subscription_key']}:${user.companyId}`;
    const trialKey = `${subscriptionKey}:isTrail`;

    const [checkCacheExist, checkTrial] = await Promise.all([
      this.redisService.get(subscriptionKey),
      this.redisService.get(trialKey),
    ]);

    let subscriptionEndDate: Date;
    let isTrial = false;

    console.log('Redis subscription:', checkCacheExist);
    console.log('Redis trial:', checkTrial);

    if (typeof checkCacheExist === 'string' && typeof checkTrial === 'string') {
      subscriptionEndDate = new Date(checkCacheExist);

      isTrial = checkTrial === 'true' || checkTrial === '1';
    } else {
      const company = await this.prisma.company.findUnique({
        where: {
          id: user.companyId,
        },
        select: {
          id: true,
          isTrial: true,
          subscriptionEndDate: true,
        },
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

      await Promise.all([
        this.redisService.set(
          subscriptionKey,
          subscriptionEndDate.toISOString(),
          3600,
        ),
        this.redisService.set(trialKey, String(isTrial), 3600),
      ]);
    }

    console.log('subscriptionEndDate:', subscriptionEndDate);
    console.log('isTrial:', isTrial);
    if (!subscriptionEndDate) {
      throw new ForbiddenException(
        'No active subscription found. Please subscribe to continue.',
      );
    }

    if (subscriptionEndDate < new Date()) {
      throw new ForbiddenException(
        isTrial
          ? 'Your trial period has expired. Please subscribe to continue.'
          : 'Your subscription has expired. Please renew to continue.',
      );
    }

    return true;
  }
}
