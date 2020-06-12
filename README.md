# NestJS Throttler Package

A Rate-Limiter for NestJS, regardless of the context.

For an overview of the community storage providers, see [Community Storage Providers](#community-storage-providers).

This package comes with a couple of goodies that should be mentioned, first is the `ThrottlerModule`.

# Table of Contents

- [NestJS Throttler Package](#nestjs-throttler-package)
- [Table of Contents](#table-of-contents)
- [Usage](#usage)
  - [ThrottlerModule](#throttlermodule)
  - [Decorators](#decorators)
    - [@Throttle()](#throttle)
    - [@SkipThrottle()](#skipthrottle)
  - [Ignoring specific user agents](#ignoring-specific-user-agents)
  - [ThrottlerStorage](#throttlerstorage)
  - [Working with Websockets](#working-with-websockets)
  - [Working with GraphQL](#working-with-graphql)
- [Community Storage Providers](#community-storage-providers)

# Usage

## ThrottlerModule

The `ThrottleModule` is the main entry point for this package, and can be used
in a synchronous or asynchronous manner. All the needs to be passed is the
`ttl`, the time to live in seconds for the request tracker, and the `limit`, or
how many times an endpoint can be hit before returning a 429.

```ts
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from 'nestjs-throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10,
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

The above would mean that 10 requests from the same IP can be made to a single endpoint in 1 minute.

```ts
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: config.get('THROTTLE_TTL'),
        limit: config.get('THROTTLE_LIMIT'),
      }),
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

The above is also a valid configuration for asynchronous registration of the module.

**NOTE:** If you add the `ThrottlerGuard` to your `AppModule` as a global guard
then all the incoming requests will be throttled by default. This can also be
omitted in favor of `@UseGuards(ThrottlerGuard)`. The global guard check can be
skipped using the `@SkipThrottle()` decorator mentioned later.

Example with `@UseGuards(ThrottlerGuard)`:

```ts
// app.module.ts
@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10,
    }),
  ],
})
export class AppModule {}

// app.controller.ts
@Controller()
export class AppController {
  @UseGuards(ThrottlerGuard)
  @Throttle(5, 30)
  normal() {}
}
```

## Decorators

### @Throttle()

```ts
@Throttle(limit: number = 20, ttl: number = 60)
```

This decorator will set THROTTLER_LIMIT and THROTTLER_TTL metadatas on the
route, for retrieval from the `Reflector` class. Can be applied to controllers
and routes.

### @SkipThrottle()

```ts
@SkipThrottle(skip = true)
```

This decorator can be used to skip a route or a class **or** to negate the
skipping of a route in a class that is skipped.

```ts
@SkipThrottle()
@Controller()
export class AppController {
  @SkipThrottle(false)
  dontSkip() {}

  doSkip() {}
}
```

In the above controller, `dontSkip` would be counted against and rate-limited
while `doSkip` would not be limited in any way.

## Ignoring specific user agents

You can use the `ignoreUserAgents` key to ignore specific user agents.

```ts
@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10,
      ignoreUserAgents: [
        // Don't throttle request that have 'googlebot' defined in them.
        // Example user agent: Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)
        /googlebot/gi,

        // Don't throttle request that have 'bingbot' defined in them.
        // Example user agent: Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)
        new RegExp('bingbot', 'gi'),
      ],
    }),
  ],
})
export class AppModule {}
```

## ThrottlerStorage

Interface to define the methods to handle the details when it comes to keeping track of the requests.

Currently the key is seen as an `MD5` hash of the `IP` the `ClassName` and the
`MethodName`, to ensure that no unsafe characters are used and to ensure that
the package works for contexts that don't have explicit routes (like Websockets
and GraphQL).

The interface looks like this:

```ts
export interface ThrottlerStorage {
  getRecord(key: string): Promise<number[]>;
  addRecord(key: string, ttl: number): Promise<void>;
}
```

So long as the Storage service implements this interface, it should be usable by the `ThrottlerGuard`.

## Working with Websockets

To get the `ThrottlerModule` working with websockets, not much is needed besides regular
configuration. The things to make note of are that 1) you cannot bind the guard with
`APP_GUARD` or `app.useGlobalGuards()` due to how Nest binds global guards and 2) when a limit is
reached, Nest will emit an `exception` event, so make sure there is a listener ready for this.
Other than that, no extra configuration is needed.

## Working with GraphQL

To get the `ThrottlerModule` to work with the GraphQL context, a couple of things must happen.
First, you must use `Express` and `apollo-server-express` as your GraphQL server engine. This is
the default for Nest, but the [`apollo-server-fastify`](https://github.com/apollographql/apollo-server/tree/master/packages/apollo-server-fastify) package
does not currently support passing `res` to the `context`, meaning headers cannot be properly set.
Second, when configuring your `GraphQLModule`, you need to pass an option for `context` in the form
of `({ req, res}) => ({ req, res })`. This will allow access to the Express Request and Response
objects, allowing for the reading and writing of headers. Other than that, no other actions are
needed, just bind the guard and you'll be good to go.

# Community Storage Providers

- [Redis](https://github.com/kkoomen/nestjs-throttler-storage-redis)

Feel free to submit a PR with your custom storage provider being added to this list.
