import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from './throttler-storage.interface';

@Injectable()
export class ThrottlerStorageService implements ThrottlerStorage {
  storage: Record<string, number[]> = {};

  getRecord(key: string): number[] {
    return this.storage[key] || [];
  }

  addRecord(key: string, ttl: number): void {
    const ttlMilliseconds = ttl * 1000;
    if (!this.storage[key]) {
      this.storage[key] = [];
    }

    this.storage[key].push(Date.now() + ttlMilliseconds);

    const timeoutId = setTimeout(() => {
      this.storage[key].shift();
      clearTimeout(timeoutId);
    }, ttlMilliseconds);
  }
}
