import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ThrottlerStorage } from './throttler-storage.interface';

@Injectable()
export class ThrottlerStorageService implements ThrottlerStorage, OnApplicationShutdown {
  private _storage: Record<string, { totalHits: number; expiresAt: number }> = {};
  private timeoutIds: NodeJS.Timeout[] = [];

  get storage(): Record<string, { totalHits: number; expiresAt: number }> {
    return this._storage;
  }

  async addRecord(key: string, ttl: number): Promise<{ totalHits: number; timeToExpire: number }> {
    const ttlMilliseconds = ttl * 1000;
    if (!this.storage[key]) {
      this.storage[key] = { totalHits: 0, expiresAt: Date.now() + ttlMilliseconds };
    }

    this.storage[key].totalHits++;

    const timeoutId = setTimeout(() => {
      this.storage[key].totalHits--;
      clearTimeout(timeoutId);
      this.timeoutIds = this.timeoutIds.filter((id) => id != timeoutId);
    }, ttlMilliseconds);
    this.timeoutIds.push(timeoutId);

    return {
      totalHits: this.storage[key].totalHits,
      timeToExpire: Math.floor((this.storage[key].expiresAt - Date.now()) / 1000),
    };
  }

  onApplicationShutdown() {
    this.timeoutIds.forEach(clearTimeout);
  }
}
