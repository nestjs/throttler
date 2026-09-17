---
'@nestjs/throttler': minor
---

Normalize IPv6 source addresses in the default tracker, and evict expired records from the in-memory storage.

The built-in `getTracker` returned `req.ip` verbatim, so a client holding an IPv6 allocation could send every request from a different address within its own subnet and never share a counter, defeating the rate limit. Addresses are now masked to a `/64` before being used as the tracker; the prefix length is configurable via the new `ipv6SubnetPrefix` module option. IPv4 addresses, IPv4-mapped addresses, the loopback, and custom `getTracker` implementations are unaffected.

`ThrottlerStorageService` also never removed records, so a stream of requests from distinct trackers grew the internal map for the lifetime of the process. Idle records are now swept out once their window has fully elapsed. Limiting behaviour is unchanged: a record is only dropped after every pending hit has expired and any block has lapsed.

Note that the tracker string for IPv6 clients changes shape (`2001:db8:0:1::/64`), so storage keys rotate once on upgrade.
