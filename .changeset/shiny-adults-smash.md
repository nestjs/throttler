---
'@nestjs/throttler': major
---

Allow for multiple Throttler Contexts

# BREAKING CHANGES

- ttl is now in milliseconds, not seconds, but there are time helper exposed to
  ease the migration to that
- the module options is now either an array or an object with a `throttlers`
  array property
- `@Throttle()` now takes in an object instead of two parameters, to allow for
  setting multiple throttle contexts at once in a more readable manner
- `@ThrottleSkip()` now takes in an object with string boolean to say which
  throttler should be skipped

# HOW TO MIGRATE

For most people, wrapping your options in an array will be enough.

If you are using a custom storage, you should wrap you `ttl` and `limit` in an
array and assign it to the `throttlers` property of the options object.

Any `@ThrottleSkip()` should now take in an object with `string: boolean` props.
The strings are the names of the throttlers. If you do not have a name, pass the
string `'default'`, as this is what will be used under the hood otherwise.

Any `@Throttle()` decorators should also now take in an object with string keys,
relating to the names of the throttler contexts (again, `'default'` if no name)
and values of objects that have `limit` and `ttl` keys.

**IMPORTANT**: The `ttl` is now in **miliseconds**. If you want to keep your ttl
in seconds for readability, usethe `seconds` helper from this package. It just
multiplies the ttl by 1000 to make it in milliseconds.
