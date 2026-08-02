import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';

export async function redisFactory(configService: ConfigService) {
  const logger = new Logger('RedisCacheModule');
  const host = configService.get<string>('REDIS_HOST');
  const port = configService.get<number>('REDIS_PORT');
  const password = configService.get<string>('REDIS_PASSWORD');
  const ttl = configService.get<number>('REDIS_TTL');

  try {
    const store = await redisStore({
      host: host,
      port: Number(port),
      password: password,
      ttl: ttl,
    });

    const redisClient = store.client;
    const pong = await redisClient.ping();

    logger.log(`🔴 Redis Ping Check: PING -> ${pong}`);

    return { store };
  } catch (error) {
    logger.error('❌ Redis Connection Failed:', error);
    throw error;
  }
}
