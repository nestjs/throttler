export interface ThrottlerStorage {
  storage: Record<string, Date[]>;

  getRecord(key: string): Date[] |undefined;
  addRecord(key: string, ttl: number): void;
}

export const ThrottlerStorage = Symbol('ThrottlerStorage');
