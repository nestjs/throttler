'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.ThrottlerException = exports.throttlerMessage = void 0;
const common_1 = require('@nestjs/common');
exports.throttlerMessage = 'ThrottlerException: Too Many Requests';
class ThrottlerException extends common_1.HttpException {
  constructor(message) {
    super(`${message || exports.throttlerMessage}`, common_1.HttpStatus.TOO_MANY_REQUESTS);
  }
}
exports.ThrottlerException = ThrottlerException;
//# sourceMappingURL=throttler.exception.js.map
