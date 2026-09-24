---
'@nestjs/throttler': patch
---

Track NAT64 (`64:ff9b::a.b.c.d`) and IPv4-compatible (`::a.b.c.d`) source addresses by their embedded IPv4 address. The default tracker used to mask them to a `/64` like any other IPv6 address, which merged every IPv4 client behind a NAT64 gateway into a single rate-limit bucket.
