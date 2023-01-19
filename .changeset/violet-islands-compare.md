---
'@nestjs/throttler': major
---

Rewrite the storage service to better handle large numbers of operations

## Why

The initial behavior was that `getRecord()` returned an list of sorted TTL
timestamps, then if it didn't reach the limit, it will call `addRecord()`.
This change was made based on the use of the Redis storage community package
where it was found how to prevent this issue. It was found out that
[express-rate-limit](https://github.com/express-rate-limit/express-rate-limit)
is incrementing a single number and returning the information in a single
roundtrip, which is significantly faster than how NestJS throttler works by
called `getRecord()`, then `addRecord`.

## Breaking Changes

- removed `getRecord`
- `addRecord(key: string, ttl: number): Promise<number[]>;` changes to `increment(key: string, ttl: number): Promise<ThrottlerStorageRecord>;`

## How to Migrate

If you are just _using_ the throttler library, you're already covered. No
changes necessary to your code, version 4.0.0 will work as is.

If you are providing a custom storage, you will need to remove your current
service's `getRecord` method and rename `addRecord` to `incremenet` while
adhering to the new interface and returning an `ThrottlerStorageRecord` object
