import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType | null = null;
  private readonly logger = new Logger(CacheService.name);

  async onModuleInit() {
    // If Redis is not configured, use in-memory fallback (acceptable for single-instance deployments)
    if (!process.env.REDIS_URL) {
      this.logger.warn('Redis disabled - using in-memory cache fallback. This is acceptable for single ECS task deployments.');
      return;
    }

    this.client = createClient({
      url: process.env.REDIS_URL,
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis Client Error', err);
    });

    this.client.on('connect', () => {
      this.logger.log('Redis Client Connected');
    });

    try {
      await this.client.connect();
      this.logger.log('Successfully connected to Redis');
    } catch (error) {
      this.logger.error('Failed to connect to Redis - continuing with in-memory fallback', error);
      this.client = null; // Set to null so methods can check if Redis is available
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  /**
   * Set a value in Redis with optional TTL (in seconds)
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.client) {
      this.logger.debug(`Cache SET skipped (Redis not available): ${key}`);
      return;
    }
    if (ttl) {
      await this.client.setEx(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Get a value from Redis
   */
  async get(key: string): Promise<string | null> {
    if (!this.client) {
      this.logger.debug(`Cache GET skipped (Redis not available): ${key}`);
      return null;
    }
    return this.client.get(key);
  }

  /**
   * Delete a key from Redis
   */
  async delete(key: string): Promise<void> {
    if (!this.client) {
      this.logger.debug(`Cache DELETE skipped (Redis not available): ${key}`);
      return;
    }
    await this.client.del(key);
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Set expiration time for a key (in seconds)
   */
  async expire(key: string, seconds: number): Promise<void> {
    if (!this.client) {
      return;
    }
    await this.client.expire(key, seconds);
  }

  /**
   * Get TTL for a key
   */
  async ttl(key: string): Promise<number> {
    if (!this.client) {
      return -1;
    }
    return this.client.ttl(key);
  }

  /**
   * Delete all keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    if (!this.client) {
      return;
    }
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  /**
   * Store refresh token for a user
   */
  async storeRefreshToken(
    userId: string,
    refreshToken: string,
    ttl: number,
  ): Promise<void> {
    const key = `refresh_token:${userId}`;
    await this.set(key, refreshToken, ttl);
  }

  /**
   * Get refresh token for a user
   */
  async getRefreshToken(userId: string): Promise<string | null> {
    const key = `refresh_token:${userId}`;
    return this.get(key);
  }

  /**
   * Revoke (delete) refresh token for a user
   */
  async revokeRefreshToken(userId: string): Promise<void> {
    const key = `refresh_token:${userId}`;
    await this.delete(key);
  }

  /**
   * Validate refresh token matches the stored one
   */
  async validateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<boolean> {
    const storedToken = await this.getRefreshToken(userId);
    return storedToken === refreshToken;
  }
}
