---
'@nestjs/throttler': patch
---

Revert resolvable properties for ttl and limit

The resolvable properties made a breaking change for custom guards that was
unforseen. This reverts it and schedules the changes for 5.0.0 instead
