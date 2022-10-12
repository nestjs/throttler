# [2.0.0](https://github.com/nestjs/throttler/compare/v1.2.1...v2.0.0) (2021-07-09)

## 3.1.0

### Minor Changes

- da3c950: Add `skipIf` option to throttler module options

  With the new option, you can pass a factory to `skipIf` and determine if the throttler guard should be used in the first palce or not. This acts just like applying `@SkipThrottle()` to every route, but can be customized to work off of the `process.env` or `ExecutionContext` object to provide better support for dev and QA environments.

## 3.0.0

### Major Changes

- c9fcd51: Upgrade nest version to v9. No breaking changes in direct code, but in nest v9 upgrade

## 2.0.1

### Patch Changes

- cf50808: fix memory leak for timeoutIds array. Before this, the timeoutIds array would not be trimmed and would grow until out of memory. Now ids are properly removed on timeout.

### Features

- adding in a comment about version ([b13bf53](https://github.com/nestjs/throttler/commit/b13bf53542236ba6b05ac537b7a677e1644a0407))

### BREAKING CHANGES

- v2 and above is now being developed specificially for
  nest v8 and could have some unforseen side effects with Nest v7. use with
  v7 at your own risk.

## [1.2.1](https://github.com/nestjs/throttler/compare/v1.2.0...v1.2.1) (2021-07-09)

### Performance Improvements

- upgrade to nest v8 ([cb5dd91](https://github.com/nestjs/throttler/commit/cb5dd913e9fcc482cd74f2d49085b98dac630215))

# [0.3.0](https://github.com/jmcdo29/nestjs-throttler/compare/0.2.3...0.3.0) (2020-11-10)

### Bug Fixes

- **module:** async register is now `forRootAsync` ([a1c6ace](https://github.com/jmcdo29/nestjs-throttler/commit/a1c6acef472e9d2368f2139e6b789ef184a7d952))

## [0.2.3](https://github.com/jmcdo29/nestjs-throttler/compare/0.2.2...0.2.3) (2020-08-06)

### Features

- **ws:** allows for optional use of @nestjs/websocket ([f437614](https://github.com/jmcdo29/nestjs-throttler/commit/f437614cab5aebfdfdb4d5884f45b58b16d5a140))

## [0.2.2](https://github.com/jmcdo29/nestjs-throttler/compare/0.2.1...0.2.2) (2020-06-12)

### Bug Fixes

- moves userAgent check to http handler ([87183af](https://github.com/jmcdo29/nestjs-throttler/commit/87183af8fc189d7d5c8237832089138a0b40589b))

### Features

- **decorator:** add setThrottlerMetadata() function back ([ea31a9c](https://github.com/jmcdo29/nestjs-throttler/commit/ea31a9c86b82550e2d43f3433ec618785cf2b34a))
- **graphql:** implements graphql limiter ([40eaff1](https://github.com/jmcdo29/nestjs-throttler/commit/40eaff16dae5c0279001e56ff64a2b540d82a3c7))
- Add support for ws (websockets) ([a745295](https://github.com/jmcdo29/nestjs-throttler/commit/a74529517f989c43d77c9a63712e82244ebeefcd))
- Add support for ws (websockets) ([8103a5a](https://github.com/jmcdo29/nestjs-throttler/commit/8103a5a11c1916f05f8c44e302ba93a98d7cb77d))
- Make storage methods async ([92cd4eb](https://github.com/jmcdo29/nestjs-throttler/commit/92cd4ebf507b3bed4efbaeb7bb47bd1738a62dc3))
- **exception:** Use const instead of duplicated string ([f95da2c](https://github.com/jmcdo29/nestjs-throttler/commit/f95da2c4fc787c7c5e525672d668745bc1f2301d))
- **guard:** Add default case for context.getType() switch ([ff46d57](https://github.com/jmcdo29/nestjs-throttler/commit/ff46d57508c4b446918ccd75f704d0eed1ae352f))
- Implement basic support for websocket ([3a0cf2e](https://github.com/jmcdo29/nestjs-throttler/commit/3a0cf2ed70c7abbe02e9d96f26ab2c81b3c7bb2f))

## [0.2.1](https://github.com/jmcdo29/nestjs-throttler/compare/0.2.0...0.2.1) (2020-06-09)

### Features

- add support for ignoreUserAgents option ([1ab5e17](https://github.com/jmcdo29/nestjs-throttler/commit/1ab5e17a25a95ec14910e199726eac07f66f4475))

# [0.2.0](https://github.com/jmcdo29/nestjs-throttler/compare/0.1.1...0.2.0) (2020-06-09)

### Bug Fixes

- make core module global and export core module inside ThrottlerModule ([1f4df42](https://github.com/jmcdo29/nestjs-throttler/commit/1f4df42a5fc9a6f75c398bbb6a3f9ebaec6bc80f))

### Features

- makes options required in forRoot and forRootAsync ([14e272a](https://github.com/jmcdo29/nestjs-throttler/commit/14e272a842a90db93dd9e8c60c936fbcf0bcd3b7))
- remove global guard and require user to implement it manually ([840eae4](https://github.com/jmcdo29/nestjs-throttler/commit/840eae4643867390bc598937b20e132257e9b018))

## [0.1.1](https://github.com/jmcdo29/nestjs-throttler/compare/0.1.0...0.1.1) (2020-06-07)

### Bug Fixes

- **interface:** fixes the storage interface to be async ([f7565d9](https://github.com/jmcdo29/nestjs-throttler/commit/f7565d9029baf4d7687f0913046f555d17cde44b))

# 0.1.0 (2020-06-07)

### Bug Fixes

- adds back AppModule to allow for running server for tests ([5af229b](https://github.com/jmcdo29/nestjs-throttler/commit/5af229ba69527daf3662b1899ed985fa9404251b))
- updates some types ([b26fc06](https://github.com/jmcdo29/nestjs-throttler/commit/b26fc06841a430e5728cde6276515130b89a7289))
- updates storage interface to use number ([339f29c](https://github.com/jmcdo29/nestjs-throttler/commit/339f29c12b4720a7376ec042988f73460172b32e))
- updates tests and resolves comments from pr ([ee87e05](https://github.com/jmcdo29/nestjs-throttler/commit/ee87e05e2f5eb61b00b423d6394be9a131f84f8a))
- **.gitignore:** Ignore all dist and node_modules rather than root-level only ([d9609af](https://github.com/jmcdo29/nestjs-throttler/commit/d9609afb9cf3561b84082ac9a3e2e26ddcbb2117))
- **guard:** Change RateLimit header prefix to X-RateLimit ([328c0a3](https://github.com/jmcdo29/nestjs-throttler/commit/328c0a3c1009fdc65820125c2145de65aebd3fee))
- **guard:** Change RateLimit header prefix to X-RateLimit ([3903885](https://github.com/jmcdo29/nestjs-throttler/commit/3903885df9eaac0d966c5b8207fae26b62f337f3))
- **guard:** guard now binds globally without the use of @UseGuards() ([4022447](https://github.com/jmcdo29/nestjs-throttler/commit/40224475d27f1ec0cf792225bbc18df33ab14cc2))
- **guard:** guard now binds globally without the use of @UseGuards() ([3ca146d](https://github.com/jmcdo29/nestjs-throttler/commit/3ca146d41afa71e3c68b73d8706e7431f929a85a))
- **guard:** Prevent RateLimit-Remaining from going below 0 ([25e33c8](https://github.com/jmcdo29/nestjs-throttler/commit/25e33c882007892a3285c92449aa5bc0840a8909))
- **guard:** Prevent RateLimit-Remaining from going below 0 ([74b1668](https://github.com/jmcdo29/nestjs-throttler/commit/74b166888ab283281a964d6c64b94224e2f96ba4))
- **guard:** Use the correct approach to check for excluded routes ([38eac3c](https://github.com/jmcdo29/nestjs-throttler/commit/38eac3ca3bdad0b4b266587bc4b0287f3f69f640))
- **guard:** Use the correct approach to check for excluded routes ([912813f](https://github.com/jmcdo29/nestjs-throttler/commit/912813f49cc98e8fbd2643650d22ea8cc88c77ae))
- req.method value in httpPromise ([b9ee26e](https://github.com/jmcdo29/nestjs-throttler/commit/b9ee26e5e888e4d4f220e91adc996ade764f7002))

### Features

- Swap excludeRoutes for @SkipThrottle() decorator ([16d6fac](https://github.com/jmcdo29/nestjs-throttler/commit/16d6facd5e8f648620fa47e372078db37472f619))
- **fastify:** updates guard to work for fastify ([bc678a3](https://github.com/jmcdo29/nestjs-throttler/commit/bc678a363c367d132a90a2a4282e3f033f526e00))
- Implement ignoreRoutes functionality ([7b8ab42](https://github.com/jmcdo29/nestjs-throttler/commit/7b8ab4273fffafc0dd0571393d8c0faf89afc42f))
- **package.json:** Add --watch to start:dev script ([3c4c28a](https://github.com/jmcdo29/nestjs-throttler/commit/3c4c28abbb324e064f65b284f1a99683cd02030b))
- Implement ignoreRoutes functionality ([75f870c](https://github.com/jmcdo29/nestjs-throttler/commit/75f870c5b49e4d22c70519d28f8efffc1da288eb))
- **module:** implements start of limiter module ([35dbff5](https://github.com/jmcdo29/nestjs-throttler/commit/35dbff5d30e7a1385a4f4cf688992017eb7e0566))
- **package.json:** Add --watch to start:dev script ([a6b441c](https://github.com/jmcdo29/nestjs-throttler/commit/a6b441cad221b7eee52be0ba81c66fca81853c4f))
- Add global ThrottlerGuard ([9a84aff](https://github.com/jmcdo29/nestjs-throttler/commit/9a84afff5d57a16731d021cb47d60c2b4d02eb02))
- adds httpromise for async/await http calls in tests ([70210c7](https://github.com/jmcdo29/nestjs-throttler/commit/70210c76173aabfd5f85f5a24e624e7c4c010ae2))
- Rename certain variables to use the THROTTLER prefix ([6a21b21](https://github.com/jmcdo29/nestjs-throttler/commit/6a21b216a2738aa470e2138d44053ba8413ce117))
- Setup example app ([df6b5f6](https://github.com/jmcdo29/nestjs-throttler/commit/df6b5f633ebbb4770d3eb9e72e8075cbe6b2f78a))
- Setup example app ([30c7576](https://github.com/jmcdo29/nestjs-throttler/commit/30c75764fd20f3afe7a3f7533a3f4f08d275a741))
