---
'@nestjs/throttler': patch
---

Sort throttlers by `ttl` when one of them uses a callback `ttl`. The comparator was not consistent, so a throttler with a callback `ttl` could stay ahead of the others and the static ones were left unsorted. A request rejected by a short throttler was then still counted against a longer one, which could block the client for the whole longer window.
