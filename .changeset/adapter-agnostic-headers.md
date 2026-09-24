---
'@nestjs/throttler': patch
---

Set rate limit headers through `res.setHeader()` when the response has no `res.header()` method, so the guard no longer throws `res.header is not a function` on custom HTTP adapters. The logic lives in a new protected `setResponseHeader()` method that subclasses can override.
