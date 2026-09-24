---
'@nestjs/throttler': patch
---

Log a warning, once per context type, when the guard cannot determine a tracker. Every such request produced the same storage key, so one client could exhaust the limit for all of them without anything failing, as with a global guard on a WebSocket gateway or a GraphQL subscription.
