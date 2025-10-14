<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

  <p align="center">A progressive <a href="http://nodejs.org" target="blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore"><img src="https://img.shields.io/npm/dm/@nestjs/core.svg" alt="NPM Downloads" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#5" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://twitter.com/nestframework"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>

## Description

A Rate-Limiter for NestJS, regardless of the context.

Throttler ensures that users can only make `limit` requests per `ttl` to each endpoint. By default, users are identified by their IP address. This behavior can be customized by providing your own `getTracker` function. See [Proxies](#proxies) for an example where this is useful.

Throttler comes with a built-in in-memory cache to keep track of the requests. It supports alternate storage providers. For an overview, see [Community Storage Providers](#community-storage-providers).

## Installation

```bash
$ npm i --save @nestjs/throttler
```

## Versions

`@nestjs/throttler@^1` is compatible with Nest v7 while `@nestjs/throttler@^2` is compatible with Nest v7 and Nest v8, but it is suggested to be used with only v8 in case of breaking changes against v7 that are unseen.

For NestJS v10, please use version 4.1.0 or above.

## Usage

### ThrottlerModule

Once the installation is complete, the `ThrottlerModule` can be configured as any other Nest package with `forRoot` or `forRootAsync` methods.

```typescript
@@filename(app.module)
@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
  ],
})
export class AppModule {}
```

The above will set the global options for the `ttl`, the time to live in milliseconds, and the `limit`, the maximum number of requests within the ttl, for the routes of your application that are guarded.

Once the module has been imported, you can then choose how you would like to bind the `ThrottlerGuard`. Any kind of binding as mentioned in the [guards](https://docs.nestjs.com/guards) section is fine. If you wanted to bind the guard globally, for example, you could do so by adding this provider to any module:

```typescript
{
  provide: APP_GUARD,
  useClass: ThrottlerGuard
}
```

#### Multiple Throttler Definitions

There may come upon times where you want to set up multiple throttling definitions, like no more than 3 calls in a second, 20 calls in 10 seconds, and 100 calls in a minute. To do so, you can set up your definitions in the array with named options, that can later be referenced in the `@SkipThrottle()` and `@Throttle()` decorators to change the options again.

```typescript
@@filename(app.module)
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100
      }
    ]),
  ],
})
export class AppModule {}
```

### Customization

There may be a time where you want to bind the guard to a controller or globally, but want to disable rate limiting for one or more of your endpoints. For that, you can use the `@SkipThrottle()` decorator, to negate the throttler for an entire class or a single route. The `@SkipThrottle()` decorator can also take in an object of string keys with boolean values, if you have more than one throttler set. If you do not pass an object, the default is to use `{ default: true }`

```typescript
@SkipThrottle()
@Controller('users')
export class UsersController {}
```

This `@SkipThrottle()` decorator can be used to skip a route or a class or to negate the skipping of a route in a class that is skipped.

```typescript
@SkipThrottle()
@Controller('users')
export class UsersController {
  // Rate limiting is applied to this route.
  @SkipThrottle({ default: false })
  dontSkip() {
    return 'List users work with Rate limiting.';
  }
  // This route will skip rate limiting.
  doSkip() {
    return 'List users work without Rate limiting.';
  }
}
```

There is also the `@Throttle()` decorator which can be used to override the `limit` and `ttl` set in the global module, to give tighter or looser security options. This decorator can be used on a class or a function as well. With version 5 and onwards, the decorator takes in an object with the string relating to the name of the throttler set, and an object with the limit and ttl keys and integer values, similar to the options passed to the root module. If you do not have a name set in your original options, use the string `default` You have to configure it like this:

```typescript
// Override default configuration for Rate limiting and duration.
@Throttle({ default: { limit: 3, ttl: 60000 } })
@Get()
findAll() {
  return "List users works with custom rate limiting.";
}
```

### Proxies

If your application runs behind a proxy server, check the specific HTTP adapter options ([express](http://expressjs.com/en/guide/behind-proxies.html) and [fastify](https://www.fastify.io/docs/latest/Reference/Server/#trustproxy)) for the `trust proxy` option and enable it. Doing so will allow you to get the original IP address from the `X-Forwarded-For` header.

For express, no further configuration is needed because express sets `req.ip` to the client IP if `trust proxy` is enabled. For fastify, you need to read the client IP from `req.ips` instead. The following example is only needed for fastify, but works with both engines:

```typescript
// throttler-behind-proxy.guard.ts
import { ThrottlerGuard } from '@nestjs/throttler';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    // The client IP is the leftmost IP in req.ips. You can individualize IP
    // extraction to meet your own needs.
    const tracker = req.ips.length > 0 ? req.ips[0] : req.ip;
    return Promise.resolve(tracker);
  }
}

// app.controller.ts
import { ThrottlerBehindProxyGuard } from './throttler-behind-proxy.guard';

@UseGuards(ThrottlerBehindProxyGuard)
```

> **Hint:** You can find the API of the `req` Request object for express [here](https://expressjs.com/en/api.html#req.ips) and for fastify [here](https://www.fastify.io/docs/latest/Reference/Request/).

### Websockets

This module can work with websockets, but it requires some class extension. You can extend the `ThrottlerGuard` and override the `handleRequest` method like so:

```typescript
@Injectable()
export class WsThrottlerGuard extends ThrottlerGuard {
  async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context, limit, ttl, throttler, blockDuration, generateKey } = requestProps;

    const client = context.switchToWs().getClient();
    const tracker = client._socket.remoteAddress;
    const key = generateKey(context, tracker, throttler.name);
    const { totalHits, timeToExpire, isBlocked, timeToBlockExpire } =
      await this.storageService.increment(key, ttl, limit, blockDuration, throttler.name);

    // Throw an error when the user reached their limit.
    if (isBlocked) {
      await this.throwThrottlingException(context, {
        limit,
        ttl,
        key,
        tracker,
        totalHits,
        timeToExpire,
        isBlocked,
        timeToBlockExpire,
      });
    }

    return true;
  }
}
```

> **Hint:** If you are using ws, it is necessary to replace the `_socket` with `conn`.

There's a few things to keep in mind when working with WebSockets:

- Guard cannot be registered with the `APP_GUARD` or `app.useGlobalGuards()`
- When a limit is reached, Nest will emit an `exception` event, so make sure there is a listener ready for this

> **Hint:** If you are using the `@nestjs/platform-ws` package you can use `client._socket.remoteAddress` instead.

### GraphQL

The `ThrottlerGuard` can also be used to work with GraphQL requests. Again, the guard can be extended, but this time the `getRequestResponse` method will be overridden:

```typescript
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  getRequestResponse(context: ExecutionContext) {
    const gqlCtx = GqlExecutionContext.create(context);
    const ctx = gqlCtx.getContext();
    return { req: ctx.req, res: ctx.res };
  }
}
```

However, when using Apollo Express/Fastify or Mercurius, it's important to configure the context correctly in the GraphQLModule to avoid any problems.

#### Apollo Server (for Express):

For Apollo Server running on Express, you can set up the context in your GraphQLModule configuration as follows:

```typescript
GraphQLModule.forRoot({
  // ... other GraphQL module options
  context: ({ req, res }) => ({ req, res }),
});
```

#### Apollo Server (for Fastify) & Mercurius:

When using Apollo Server with Fastify or Mercurius, you need to configure the context differently. You should use request and reply objects. Here's an example:

```typescript
GraphQLModule.forRoot({
  // ... other GraphQL module options
  context: (request, reply) => ({ request, reply }),
});
```

### Configuration

The following options are valid for the object passed to the array of the `ThrottlerModule`'s options:

<table>
  <tr>
    <td><code>name</code></td>
    <td>the name for internal tracking of which throttler set is being used. Defaults to `default` if not passed</td>
  </tr>
  <tr>
    <td><code>ttl</code></td>
    <td>the number of milliseconds that each request will last in storage</td>
  </tr>
  <tr>
    <td><code>limit</code></td>
    <td>the maximum number of requests within the TTL limit</td>
  </tr>
  <tr>
    <td><code>blockDuration</code></td>
    <td>the number of milliseconds the request will be blocked</td>
  </tr>
  <tr>
    <td><code>ignoreUserAgents</code></td>
    <td>an array of regular expressions of user-agents to ignore when it comes to throttling requests</td>
  </tr>
  <tr>
    <td><code>skipIf</code></td>
    <td>a function that takes in the <code>ExecutionContext</code> and returns a <code>boolean</code> to short circuit the throttler logic. Like <code>@SkipThrottler()</code>, but based on the request</td>
  </tr>
  <tr>
    <td><code>getTracker</code></td>
    <td>a function that takes in the <code>Request</code> and <code>ExecutionContext</code>, and returns a <code>string</code> to override the default logic of the <code>getTracker</code> method</td>
  </tr>
   <tr>
    <td><code>generateKey</code></td>
    <td>a function that takes in the <code>ExecutionContext</code>, the tracker <code>string</code> and the throttler name as a <code>string</code> and returns a <code>string</code> to override the final key which will be used to store the rate limit value. This overrides the default logic of the <code>generateKey</code> method</td>
  </tr>
</table>

If you need to set up storages instead, or want to use a some of the above options in a more global sense, applying to each throttler set, you can pass the options above via the `throttlers` option key and use the below table

<table>
  <tr>
    <td><code>storage</code></td>
    <td>a custom storage service for where the throttling should be kept track. <a href="#storages">See Storages below.</a></td>
  </tr>
  <tr>
    <td><code>ignoreUserAgents</code></td>
    <td>an array of regular expressions of user-agents to ignore when it comes to throttling requests</td>
  </tr>
  <tr>
    <td><code>skipIf</code></td>
    <td>a function that takes in the <code>ExecutionContext</code> and returns a <code>boolean</code> to short circuit the throttler logic. Like <code>@SkipThrottler()</code>, but based on the request</td>
  </tr>
  <tr>
    <td><code>throttlers</code></td>
    <td>an array of throttler sets, defined using the table above</td>
  </tr>
  <tr>
    <td><code>errorMessage</code></td>
    <td>a <code>string</code> OR a function that takes in the <code>ExecutionContext</code> and the <code>ThrottlerLimitDetail</code> and returns a <code>string</code> which overrides the default throttler error message</td>
  </tr>
  <tr>
    <td><code>getTracker</code></td>
    <td>a function that takes in the <code>Request</code> and <code>ExecutionContext</code>, and returns a <code>string</code> to override the default logic of the <code>getTracker</code> method</td>
  </tr>
   <tr>
    <td><code>generateKey</code></td>
    <td>a function that takes in the <code>ExecutionContext</code>, the tracker <code>string</code> and the throttler name as a <code>string</code> and returns a <code>string</code> to override the final key which will be used to store the rate limit value. This overrides the default logic of the <code>generateKey</code> method</td>
  </tr>
</table>

#### Async Configuration

You may want to get your rate-limiting configuration asynchronously instead of synchronously. You can use the `forRootAsync()` method, which allows for dependency injection and `async` methods.

One approach would be to use a factory function:

```typescript
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get('THROTTLE_TTL'),
          limit: config.get('THROTTLE_LIMIT'),
        },
      ],
    }),
  ],
})
export class AppModule {}
```

You can also use the `useClass` syntax:

```typescript
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useClass: ThrottlerConfigService,
    }),
  ],
})
export class AppModule {}
```

This is doable, as long as `ThrottlerConfigService` implements the interface `ThrottlerOptionsFactory`.

### Storages

The built in storage is an in memory cache that keeps track of the requests made until they have passed the TTL set by the global options. You can drop in your own storage option to the `storage` option of the `ThrottlerModule` so long as the class implements the `ThrottlerStorage` interface.

> **Note:** `ThrottlerStorage` can be imported from `@nestjs/throttler`.

### Time Helpers

There are a couple of helper methods to make the timings more readable if you prefer to use them over the direct definition. `@nestjs/throttler` exports five different helpers, `seconds`, `minutes`, `hours`, `days`, and `weeks`. To use them, simply call `seconds(5)` or any of the other helpers, and the correct number of milliseconds will be returned.

### Migrating to v5 from earlier versions

If you migrate to v5 from earlier versions, you need to wrap your options in an array.

If you are using a custom storage, you should wrap you `ttl` and `limit` in an array and assign it to the `throttlers` property of the options object.

Any `@ThrottleSkip()` should now take in an object with `string: boolean` props. The strings are the names of the throttlers. If you do not have a name, pass the string `'default'`, as this is what will be used under the hood otherwise.

Any `@Throttle()` decorators should also now take in an object with string keys, relating to the names of the throttler contexts (again, `'default'` if no name) and values of objects that have `limit` and `ttl` keys.

> **Important:** The `ttl` is now in **milliseconds**. If you want to keep your ttl in seconds for readability, use the `seconds` helper from this package. It just multiplies the ttl by 1000 to make it in milliseconds.

For more info, see the [Changelog](https://github.com/nestjs/throttler/blob/master/CHANGELOG.md#500)

## Community Storage Providers

- [Redis](https://github.com/CSenshi/nestjs-redis/tree/main/packages/throttler-storage) (`node-redis` based)
- [Redis](https://github.com/jmcdo29/nest-lab/tree/main/packages/throttler-storage-redis) (`ioredis` based)
- [Mongo](https://www.npmjs.com/package/nestjs-throttler-storage-mongo)

Feel free to submit a PR with your custom storage provider being added to this list.

## License

Nest is [MIT licensed](LICENSE).

<p align="right"><a href="#toc">🔼 Back to TOC</a></p>
