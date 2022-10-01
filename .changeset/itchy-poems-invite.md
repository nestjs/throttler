---
'@nestjs/throttler': minor
---

Add `skipIf` option to throttler module options

With the new option, you can pass a factory to `skipIf` and determine if the throttler guard should be used in the first palce or not. This acts just like applying `@SkipThrottle()` to every route, but can be customized to work off of the `process.env` or `ExecutionContext` object to provide better support for dev and QA environments.
