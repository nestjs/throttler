---
'@nestjs/throttler': patch
---

Support request-scoped guards. Nest does not call `onModuleInit()` on these instances, so a guard that is request-scoped, or depends on a request-scoped provider, failed every request with `this.throttlers is not iterable`.
