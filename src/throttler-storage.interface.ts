export interface ThrottlerStorage {
  storage: Record<string, number>;

  getRecord(key: string): number;
  addRecord(key: string, tty: number): void;
}

export const ThrottlerStorage = Symbol('ThrottlerStorage');
