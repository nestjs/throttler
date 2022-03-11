---
'@nestjs/throttler': patch
---

fix memory leak for timeoutIds array. Before this, the timeoutIds array would not be trimmed and would grow until out of memory. Now ids are properly removed on timeout.
