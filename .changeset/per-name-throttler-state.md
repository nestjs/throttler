---
'@nestjs/throttler': patch
---

Keep the window and the block of each throttler apart when several throttlers share a storage key, as they do when a custom `generateKey` leaves the throttler name out. Only the hit count was kept per throttler, so a throttler blocked every other one on the key, the end of its block reset the others' hit counts, and the first throttler's `ttl` set `timeToExpire` (and `X-RateLimit-Reset`) for all of them.
