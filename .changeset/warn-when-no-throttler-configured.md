---
'@nestjs/throttler': patch
---

Log a warning when no throttler is configured. The guard limits nothing in that case and previously said nothing at boot, so `ThrottlerModule.forRoot()` and `ThrottlerModule.forRoot([])` looked like a working setup.
