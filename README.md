<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[travis-image]: https://api.travis-ci.org/nestjs/nest.svg?branch=master
[travis-url]: https://travis-ci.org/nestjs/nest
[linux-image]: https://img.shields.io/travis/nestjs/nest/master.svg?label=linux
[linux-url]: https://travis-ci.org/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore"><img src="https://img.shields.io/npm/dm/@nestjs/core.svg" alt="NPM Downloads" /></a>
<a href="https://travis-ci.org/nestjs/nest"><img src="https://api.travis-ci.org/nestjs/nest.svg?branch=master" alt="Travis" /></a>
<a href="https://travis-ci.org/nestjs/nest"><img src="https://img.shields.io/travis/nestjs/nest/master.svg?label=linux" alt="Linux" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#5" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://twitter.com/nestframework"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

A Rate-Limiter for NestJS, regardless of the context.

For an overview of the community storage providers, see [Community Storage Providers](#community-storage-providers).

This package comes with a couple of goodies that should be mentioned, first is the `ThrottlerModule`.


## Installation

```bash
$ npm i --save @nestjs/throttler
```

## Versions

`@nestjs/throttler@^1` is compatible with Nest v7 while `@nestjs/throttler@^2` is compatible with Nest v7 and Nest v8, but it is suggested to be used with only v8 in case of breaking changes against v7 that are unseen.

## Table of Contents

- [Description](#description)
- [Versions](#versions)
- [Table of Contents](#table-of-contents)
- [Usage](#usage)
  - [ThrottlerModule](#throttlermodule)
  - [Decorators](#decorators)
    - [@Throttle()](#throttle)
    - [@SkipThrottle()](#skipthrottle)
  - [Ignoring specific user agents](#ignoring-specific-user-agents)
  - [ThrottlerStorage](#throttlerstorage)
  - [Proxies](#proxies)
  - [Working with Websockets](#working-with-websockets)
  - [Working with GraphQL](#working-with-graphql)
- [Community Storage Providers](#community-storage-providers)

## Usage

### ThrottlerModule

The `ThrottleModule` is the main entry point for this package, and can be used
in a synchronous or asynchronous manner. All the needs to be passed is the
`ttl`, the time to live in seconds for the request tracker, and the `limit`, or
how many times an endpoint can be hit before returning a 429.

```ts
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

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

### Decorators

#### @Throttle()

```ts
@Throttle(limit: number = 30, ttl: number = 60)
```

This decorator will set `THROTTLER_LIMIT` and `THROTTLER_TTL` metadatas on the
route, for retrieval from the `Reflector` class. Can be applied to controllers
and routes.

#### @SkipThrottle()

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

### Ignoring specific user agents

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

### Ignoring by a logic

You can use the `skip`. `skip` can return a Promise of boolean.

```ts
@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10,
      skip(context, req, res) {
        return req.ip === 'google-bot-ip';
      }
    }),
  ],
})
```

Override by `@SkipThrottle`

```ts
@Controller()
@SkipThrottle((context, req, res) => req.ip === 'another-ip')
class Controller {
  @Get() // skip when req.ip === 'another-ip'
  async index() {
    return '';
  }

  @Get('root-setting')
  @SkipThrottle(false) // skip when req.ip === 'google-bot-ip'
  async useDefault() {
    return '';
  }

  @Get('method-setting')
  @SkipThrottle((context, req, res) => req.ip === 'another-ip-1') // skip when req.ip === 'another-ip-1'
  async useMethod() {
    return '';
  }

  @Get('dont-skip-at-all')
  @SkipThrottle(null) // don't skip at all
  async dontSkipAtAll() {
    return '';
  }
}
```

### ThrottlerStorage

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

### Proxies

If you are working behind a proxy, check the specific HTTP adapter options ([express](http://expressjs.com/en/guide/behind-proxies.html) and [fastify](https://www.fastify.io/docs/latest/Server/#trustproxy)) for the `trust proxy` option and enable it. Doing so will allow you to get the original IP address from the `X-Forward-For` header, and you can override the `getTracker()` method to pull the value from the header rather than from `req.ip`. The following example works with both express and fastify:

```ts
// throttler-behind-proxy.guard.ts
import { ThrottlerGuard } from '@nestjs/throttler';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): string {
    return req.ips.length ? req.ips[0] : req.ip; // individualize IP extraction to meet your own needs
  }
}

// app.controller.ts
import { ThrottlerBehindProxyGuard } from './throttler-behind-proxy.guard';
@UseGuards(ThrottlerBehindProxyGuard)
```

### Working with Websockets

To work with Websockets you can extend the `ThrottlerGuard` and override the `handleRequest` method with something like the following method

```ts
@Injectable()
export class WsThrottlerGuard extends ThrottlerGuard {
  async handleRequest(context: ExecutionContext, limit: number, ttl: number, skipMethod: (context, ...param) => boolean | Promise<boolean>): Promise<boolean> {
    const client = context.switchToWs().getClient();
    // this is a generic method to switch between `ws` and `socket.io`. You can choose what is appropriate for you
    const ip = ['conn', '_socket']
      .map((key) => client[key])
      .filter((obj) => obj)
      .shift().remoteAddress;

    if (skipMethod) {
      const isSkip = await skipMethod(context, ip);
      if (isSkip) {
        return true;
      }
    }

    const key = this.generateKey(context, ip);
    const ttls = await this.storageService.getRecord(key);

    if (ttls.length >= limit) {
      throw new ThrottlerException();
    }

    await this.storageService.addRecord(key, ttl);
    return true;
  }
}
```

There are some things to take keep in mind when working with websockets:

- You cannot bind the guard with `APP_GUARD` or `app.useGlobalGuards()` due to how Nest binds global guards.
- When a limit is reached, Nest will emit an `exception` event, so make sure there is a listener ready for this.

### Working with GraphQL

To get the `ThrottlerModule` to work with the GraphQL context, a couple of things must happen.

- You must use `Express` and `apollo-server-express` as your GraphQL server engine. This is
  the default for Nest, but the [`apollo-server-fastify`](https://github.com/apollographql/apollo-server/tree/master/packages/apollo-server-fastify) package does not currently support passing `res` to the `context`, meaning headers cannot be properly set.
- When configuring your `GraphQLModule`, you need to pass an option for `context` in the form
  of `({ req, res}) => ({ req, res })`. This will allow access to the Express Request and Response
  objects, allowing for the reading and writing of headers.
- You must add in some additional context switching to get the `ExecutionContext` to pass back values correctly (or you can override the method entirely)

```ts
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  getRequestResponse(context: ExecutionContext) {
    const gqlCtx = GqlExecutionContext.create(context);
    const ctx = gqlCtx.getContext();
    return { req: ctx.req, res: ctx.res }; // ctx.request and ctx.reply for fastify
  }
}
```

## Community Storage Providers

- [Redis](https://github.com/kkoomen/nestjs-throttler-storage-redis)

Feel free to submit a PR with your custom storage provider being added to this list.

## License

Nest is [MIT licensed](LICENSE).