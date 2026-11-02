---
'@nestjs/throttler': patch
---

Keep rejecting requests with `limit: 0` after a block has elapsed. One request got through at the end of every block, because the first hit after a block was not checked against the limit.
