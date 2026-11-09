---
'@nestjs/throttler': patch
---

Stop throwing `RangeError: Maximum call stack size exceeded` with `blockDuration: 0` once a window holds more than about 125,000 hits. Every request on that key failed with a 500 instead of being counted, even below the limit.
