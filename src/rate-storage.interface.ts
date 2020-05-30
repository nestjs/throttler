export interface RateLimitStorage {
  storage: Record<string, number>;

  getRecord(key: string): number;
  addRecord(key: string, tty: number): void;
}

export const RateLimitStorage = Symbol('RateLimitStorage');