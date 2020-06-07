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
