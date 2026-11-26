---
'@nestjs/throttler': patch
---

Stop scanning every live hit of a key on each request in the in-memory storage. The cost grew with the number of hits in the window: about 70-90 µs per request on a key holding 10,000 hits.
