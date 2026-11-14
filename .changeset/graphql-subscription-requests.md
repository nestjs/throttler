---
'@nestjs/throttler': patch
---

Fall back to the socket address when the request has no `ip`, and skip the rate limit headers when there is no response instead of failing. Both apply to GraphQL subscriptions, whose upgrade request is a plain Node.js request and which have no HTTP response.
