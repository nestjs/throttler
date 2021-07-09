'use strict';
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
          ? (desc = Object.getOwnPropertyDescriptor(target, key))
          : desc,
      d;
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
      return Reflect.metadata(k, v);
  };
var __param =
  (this && this.__param) ||
  function (paramIndex, decorator) {
    return function (target, key) {
      decorator(target, key, paramIndex);
    };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.ThrottlerGuard = void 0;
const common_1 = require('@nestjs/common');
const core_1 = require('@nestjs/core');
const md5 = require('md5');
const throttler_storage_interface_1 = require('./throttler-storage.interface');
const throttler_constants_1 = require('./throttler.constants');
const throttler_decorator_1 = require('./throttler.decorator');
const throttler_exception_1 = require('./throttler.exception');
let ThrottlerGuard = class ThrottlerGuard {
  constructor(options, storageService, reflector) {
    this.options = options;
    this.storageService = storageService;
    this.reflector = reflector;
    this.headerPrefix = 'X-RateLimit';
    this.errorMessage = throttler_exception_1.throttlerMessage;
  }
  async canActivate(context) {
    const handler = context.getHandler();
    const classRef = context.getClass();
    if (
      this.reflector.getAllAndOverride(throttler_constants_1.THROTTLER_SKIP, [handler, classRef])
    ) {
      return true;
    }
    const routeOrClassLimit = this.reflector.getAllAndOverride(
      throttler_constants_1.THROTTLER_LIMIT,
      [handler, classRef],
    );
    const routeOrClassTtl = this.reflector.getAllAndOverride(throttler_constants_1.THROTTLER_TTL, [
      handler,
      classRef,
    ]);
    const limit = routeOrClassLimit || this.options.limit;
    const ttl = routeOrClassTtl || this.options.ttl;
    return this.handleRequest(context, limit, ttl);
  }
  async handleRequest(context, limit, ttl) {
    const { req, res } = this.getRequestResponse(context);
    if (Array.isArray(this.options.ignoreUserAgents)) {
      for (const pattern of this.options.ignoreUserAgents) {
        if (pattern.test(req.headers['user-agent'])) {
          return true;
        }
      }
    }
    const tracker = this.getTracker(req);
    const key = this.generateKey(context, tracker);
    const ttls = await this.storageService.getRecord(key);
    const nearestExpiryTime = ttls.length > 0 ? Math.ceil((ttls[0] - Date.now()) / 1000) : 0;
    if (ttls.length >= limit) {
      res.header('Retry-After', nearestExpiryTime);
      this.throwThrottlingException(context);
    }
    res.header(`${this.headerPrefix}-Limit`, limit);
    res.header(`${this.headerPrefix}-Remaining`, Math.max(0, limit - (ttls.length + 1)));
    res.header(`${this.headerPrefix}-Reset`, nearestExpiryTime);
    await this.storageService.addRecord(key, ttl);
    return true;
  }
  getTracker(req) {
    return req.ip;
  }
  getRequestResponse(context) {
    const http = context.switchToHttp();
    return { req: http.getRequest(), res: http.getResponse() };
  }
  generateKey(context, suffix) {
    const prefix = `${context.getClass().name}-${context.getHandler().name}`;
    return md5(`${prefix}-${suffix}`);
  }
  throwThrottlingException(context) {
    throw new throttler_exception_1.ThrottlerException(this.errorMessage);
  }
};
ThrottlerGuard = __decorate(
  [
    common_1.Injectable(),
    __param(0, throttler_decorator_1.InjectThrottlerOptions()),
    __param(1, throttler_decorator_1.InjectThrottlerStorage()),
    __metadata('design:paramtypes', [Object, Object, core_1.Reflector]),
  ],
  ThrottlerGuard,
);
exports.ThrottlerGuard = ThrottlerGuard;
//# sourceMappingURL=throttler.guard.js.map
