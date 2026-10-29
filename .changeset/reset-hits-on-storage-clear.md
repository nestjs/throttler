---
'@nestjs/throttler': patch
---

Remove a record's hits together with the record. Since 6.7.1 the in-memory storage kept hit timestamps in a map of their own, so a record removed from `storage`, for example by `storage.clear()` between tests, left them behind: the key picked up its old hits when it came back and could be rejected on its first request, and a key that never came back kept them in memory.
