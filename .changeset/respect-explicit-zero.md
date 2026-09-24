---
'@nestjs/throttler': patch
---

Respect an explicit `0` for `limit`, `ttl` and `blockDuration` in `@Throttle()` and the module options instead of falling back to the default. `blockDuration: 0` now means "no extra block": the in-memory storage rejects requests while the window is full and lets them through again as soon as the oldest hit expires, without recording the rejected ones.
