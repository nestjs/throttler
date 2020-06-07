export interface ThrottlerStorage {
  getRecord(key: string): Promise<number[]>;
  addRecord(key: string, ttl: number): Promise<void>;
}

export const ThrottlerStorage = Symbol('ThrottlerStorage');
