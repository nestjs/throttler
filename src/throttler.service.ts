import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from './throttler-storage.interface';

@Injectable()
export class ThrottlerStorageService implements ThrottlerStorage {
  storage: Record<string, Date[]> = {};

  getRecord(key: string): Date[] {
    return this.storage[key] || [];
  }

  addRecord(key: string, ttl: number): void {
    const ttlMilliseconds = ttl * 1000;
    if (!this.storage[key]) {
      this.storage[key] = [];
    }

    this.storage[key].push(new Date(new Date().getTime() + ttlMilliseconds));

    const timeoutId = setTimeout(() => {
      this.storage[key].shift();
      clearTimeout(timeoutId);
    }, ttlMilliseconds);
  }
}
