import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

type RedisSetOptions = {
  ttlSeconds?: number;
};

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.get<string>('REDIS_URL');
    const host = this.config.get<string>('REDIS_HOST') ?? '127.0.0.1';
    const port = Number(this.config.get<string>('REDIS_PORT') ?? 6379);
    const username = this.config.get<string>('REDIS_USERNAME');
    const password = this.config.get<string>('REDIS_PASSWORD');
    const db = Number(this.config.get<string>('REDIS_DB') ?? 0);
    const keyPrefix = this.config.get<string>('REDIS_KEY_PREFIX') ?? '';

    const client = url
      ? new Redis(url, {
          lazyConnect: true,
          keyPrefix,
          maxRetriesPerRequest: 2,
          enableReadyCheck: true,
        })
      : new Redis({
          host,
          port,
          username,
          password,
          db,
          lazyConnect: true,
          keyPrefix,
          maxRetriesPerRequest: 2,
          enableReadyCheck: true,
        });

    client.on('connect', () => this.logger.log('Redis connecting...'));
    client.on('ready', () => this.logger.log('Redis ready'));
    client.on('close', () => this.logger.warn('Redis connection closed'));
    client.on('reconnecting', () => this.logger.warn('Redis reconnecting...'));
    client.on('error', (err) => this.logger.error(`Redis error: ${err.message}`));

    this.client = client;

    void client
      .connect()
      .then(() => this.logger.log('Redis connected'))
      .catch((err) =>
        this.logger.error(`Redis connect failed: ${err.message}`, err.stack),
      );
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.quit();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Redis quit failed, disconnecting: ${message}`);
      this.client.disconnect();
    } finally {
      this.client = null;
    }
  }

  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client not initialized yet');
    }
    return this.client;
  }

  async ping(): Promise<string> {
    return await this.getClient().ping();
  }

  async get(key: string): Promise<string | null> {
    return await this.getClient().get(key);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  async set(key: string, value: string, options?: RedisSetOptions): Promise<void> {
    const ttlSeconds = options?.ttlSeconds;
    if (ttlSeconds && ttlSeconds > 0) {
      await this.getClient().set(key, value, 'EX', ttlSeconds);
      return;
    }
    await this.getClient().set(key, value);
  }

  async setJson(
    key: string,
    value: unknown,
    options?: RedisSetOptions,
  ): Promise<void> {
    await this.set(key, JSON.stringify(value), options);
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return await this.getClient().del(keys);
  }
}
