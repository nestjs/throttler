export interface ThrottlerStorage {
  storage: Record<string, Date[]>;

  getRecord(key: string): Date[];
  addRecord(key: string, ttl: number): void;
}

export const ThrottlerStorage = Symbol('ThrottlerStorage');
