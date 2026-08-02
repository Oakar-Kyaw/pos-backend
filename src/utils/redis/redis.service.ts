import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS } from './redis-constant';

@Injectable()
export class RedisService {
  constructor(
    @Inject(REDIS)
    private readonly redis: Redis,
  ) {}

  async set(key: string, value: any, ttl?: number) {
    const data = JSON.stringify(value);

    if (ttl) {
      await this.redis.set(key, data, 'EX', ttl);
    } else {
      await this.redis.set(key, data);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);

    if (!value) return null;

    return JSON.parse(value) as T;
  }

  async getVersion(key: string): Promise<number> {
    const value = await this.redis.get(key);

    if (!value) return 0;

    return JSON.parse(value) as number;
  }

  async increaseVersionNumber(key: string, ttl?: number) {
    await this.redis.incr(key);

    if (ttl) {
      await this.redis.expire(key, ttl);
    }
  }

  async del(key: string) {
    return this.redis.del(key);
  }

  async exists(key: string) {
    return this.redis.exists(key);
  }

  async ping() {
    return this.redis.ping();
  }

  getClient() {
    return this.redis;
  }
}
