import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ThrottlerStorage } from './throttler-storage.interface';

@Injectable()
export class ThrottlerStorageService implements ThrottlerStorage, OnApplicationShutdown {
  private _storage: Record<string, { totalHits: number; timeToExpire: number }> = {};
  private timeoutIds: NodeJS.Timeout[] = [];

  get storage(): Record<string, { totalHits: number; timeToExpire: number }> {
    return this._storage;
  }

  async addRecord(key: string, ttl: number): Promise<{ totalHits: number; timeToExpire: number }> {
    const ttlMilliseconds = ttl * 1000;
    if (!this.storage[key]) {
      this.storage[key] = { totalHits: 0, timeToExpire: ttlMilliseconds };
    }

    this.storage[key].totalHits++;

    const timeoutId = setTimeout(() => {
      this.storage[key].totalHits--;
      clearTimeout(timeoutId);
      this.timeoutIds = this.timeoutIds.filter((id) => id != timeoutId);
    }, ttlMilliseconds);
    this.timeoutIds.push(timeoutId);

    return this.storage[key];
  }

  onApplicationShutdown() {
    this.timeoutIds.forEach(clearTimeout);
  }
}
