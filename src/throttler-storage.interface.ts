export interface ThrottlerStorage {
  getRecord(key: string): number[];
  addRecord(key: string, ttl: number): void;
}

export const ThrottlerStorage = Symbol('ThrottlerStorage');
