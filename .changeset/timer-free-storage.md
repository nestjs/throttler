---
'@nestjs/throttler': patch
---

Stop the in-memory storage from retaining request contexts. It used to schedule one `setTimeout` per counted hit, and each timer kept the request's `AsyncLocalStorage` stores (for example an ORM's per-request entity manager) in memory until the TTL expired. It now records when each hit expires and prunes expired hits on access. The idle-record sweep is also no longer tied to the context of the first request. With `blockDuration: 0`, `Retry-After` now reports when the oldest hit expires rather than when the window ends.
