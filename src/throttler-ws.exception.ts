import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { message } from './throttler.exception';

export const { WsException } = loadPackage('@nestjs/websockets', 'ThrottlerWsException');

/**
 * Throws a WsException indicating that too many requests were being fired
 * within a certain time window.
 * @publicApi
 */
export class ThrottlerWsException extends WsException {
  constructor() {
    super(`ThrottlerWsException: ${message}`);
  }
}
