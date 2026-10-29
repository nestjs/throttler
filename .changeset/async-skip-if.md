---
'@nestjs/throttler': minor
---

Allow `skipIf` to return a promise, so the decision to skip throttling can depend on an asynchronous lookup such as a database or Redis call. Synchronous `skipIf` callbacks keep working unchanged.
