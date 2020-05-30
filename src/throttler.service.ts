import { Injectable } from '@nestjs/common';
import { RateLimitStorage } from './rate-storage.interface';

@Injectable()
export class LocalLimitStorage implements RateLimitStorage {
  storage: Record<string, number>;

  getRecord(key: string): number {
    return this.storage[key] || 0;
  }

  addRecord(key: string, ttl: number): void {
    this.storage[key] = this.storage[key] ? this.storage[key] + 1 : 1;
    setTimeout(() => this.storage[key]--, ttl * 1000);
  }
}
