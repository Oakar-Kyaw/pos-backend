import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS } from './redis-constant';
import { RedisService } from './redis.service';

@Global()
@Module({})
export class RedisModule {
  static forRoot(): DynamicModule {
    return {
      global: true,
      module: RedisModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: REDIS,
          inject: [ConfigService],
          useFactory: (config: ConfigService) => {
            return new Redis({
              host: config.get<string>('REDIS_HOST'),
              port: config.get<number>('REDIS_PORT'),
              password: config.get<string>('REDIS_PASSWORD'),
            });
          },
        },
        RedisService,
      ],
      exports: [REDIS, RedisService],
    };
  }
}
