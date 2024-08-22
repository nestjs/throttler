import * as crypto from 'node:crypto';

export function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}
