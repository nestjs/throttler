# NestJS Throttler Package

An Express request throttler for controllers and routes.

## Decorator

@Throttle(limit: number = 20, ttl: number = 60)

This decorator will set THROTTLER_LIMIT and THROTTLER_TTL metadatas on the
route, for retrieval from the `Reflector` class. Can be applied to controllers
and routes.

## ThrottleGuard

Global guard. Check if metadata exists for guard. If not, check if route is in
`excludeRoutes`. If so, return `true`. If not, apply defaults from package
(configured via module). If metadata does exist, use metadata instead of
defaults (easy overriding) Pull throttlerStorage from `ThrottlerStorage` class
via `getRecord()` method. Will return a number, if number is gte max, return
`false`. If value is less than max, add value to `ThrottlerStorage` with
`addRecord()` and return `true`

## ThrottlerStorage

Class to handle the details when it comes to keeping track of the requests.
Early implementation would be something like this

```ts
class ThrottlerStorage {
  private storage: Record<string, number>;

  addRecord(key: string, ttl: number): void {
    this.storage[key] = this.storage[key] ? this.storage[key] + 1 : 1;
    setTimeout(() => this.storage[key]--, ttl * 1000)
  }

  getRecord(key: string): number {
    return this.storage[key] || 0;
  }
}
```

More than likely, the key would be a mixture of IP and REST route, to allow for
keeping each route separate and still track multiple IPs. The guard would need
to be in charge of checking if `req.ips` or `req.ip` needs to be used. The key
will be hashed using MD5 with the intention to avoid arbitrary characters.

For more information regarding the RFC specifications:

- https://tools.ietf.org/html/rfc6585#section-4
- https://tools.ietf.org/id/draft-polli-ratelimit-headers-00.html#header-specifications
