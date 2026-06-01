import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly disabled = process.env.REDIS_DISABLED === 'true';
  private readonly locks = new Map<string, NodeJS.Timeout>();
  private readonly client = this.disabled
    ? null
    : new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT || 6379),
        maxRetriesPerRequest: 2,
      });

  get raw() {
    if (!this.client) throw new Error('Redis is disabled in local test mode');
    return this.client;
  }

  async lock(key: string, ttlSeconds: number): Promise<boolean> {
    if (this.disabled) {
      if (this.locks.has(key)) return false;
      const timer = setTimeout(() => this.locks.delete(key), ttlSeconds * 1000);
      this.locks.set(key, timer);
      return true;
    }
    const result = await this.raw.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async unlock(key: string): Promise<void> {
    if (this.disabled) {
      const timer = this.locks.get(key);
      if (timer) clearTimeout(timer);
      this.locks.delete(key);
      return;
    }
    await this.raw.del(key);
  }

  async onModuleDestroy() {
    if (this.client) await this.client.quit();
    for (const timer of this.locks.values()) clearTimeout(timer);
  }
}
