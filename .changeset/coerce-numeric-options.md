---
'@nestjs/throttler': patch
---

Coerce numeric strings for `limit`, `ttl` and `blockDuration` to numbers, as returned for example by `ConfigService.get<number>()` for environment variables. Previously `Date.now() + '60000'` concatenated instead of adding, which silently corrupted every expiry and `X-RateLimit-Reset`. A value that is not numeric now fails with an error naming the option and the throttler.
