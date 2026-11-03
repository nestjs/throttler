---
'@nestjs/throttler': patch
---

Match every request against `ignoreUserAgents` patterns that use the `g` or `y` flag. These patterns keep their position between checks, so every other matching request was counted against the limit.
