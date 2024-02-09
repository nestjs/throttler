import * as crypto from 'node:crypto';

export function md5(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}
