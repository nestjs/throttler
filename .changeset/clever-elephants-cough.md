---
'@nestjs/throttler': minor
---

Use ceil instead of floor while calculating expire and block expire at to properly account for rounding up instead of down and accidentally allowing for early continued requests. Related to #2074
