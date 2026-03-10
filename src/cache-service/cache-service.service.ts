import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  // Function to get cached data or fetch from DB
  async getData(key: string, fetchFunction: () => Promise<any>, ttl = 300) {
    const cached = await this.cacheManager.get(key);
    if (cached) return cached;
    const data = await fetchFunction(); // fetch from DB/API
    await this.cacheManager.set(key, data, ttl); // set cache with TTL
    return data;
  }

  // Optional: remove cache
  async clearCache(key: string) {
    await this.cacheManager.del(key);
  }
}
