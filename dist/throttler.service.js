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
Object.defineProperty(exports, '__esModule', { value: true });
exports.ThrottlerStorageService = void 0;
const common_1 = require('@nestjs/common');
let ThrottlerStorageService = class ThrottlerStorageService {
  constructor() {
    this._storage = {};
    this.timeoutIds = [];
  }
  get storage() {
    return this._storage;
  }
  async getRecord(key) {
    return this.storage[key] || [];
  }
  async addRecord(key, ttl) {
    const ttlMilliseconds = ttl * 1000;
    if (!this.storage[key]) {
      this.storage[key] = [];
    }
    this.storage[key].push(Date.now() + ttlMilliseconds);
    const timeoutId = setTimeout(() => {
      this.storage[key].shift();
      clearTimeout(timeoutId);
    }, ttlMilliseconds);
    this.timeoutIds.push(timeoutId);
  }
  onApplicationShutdown() {
    this.timeoutIds.forEach(clearTimeout);
  }
};
ThrottlerStorageService = __decorate([common_1.Injectable()], ThrottlerStorageService);
exports.ThrottlerStorageService = ThrottlerStorageService;
//# sourceMappingURL=throttler.service.js.map
