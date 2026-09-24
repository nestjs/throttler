---
'@nestjs/throttler': major
---

Publish the package as ESM (`"type": "module"`), in line with `@nestjs/common` 12 and the other `@nestjs/*` v12 packages. The CommonJS build did a top-level `require('@nestjs/common')`, which Node rejects as a `require(esm)` cycle when both packages are loaded from the same ESM graph, for example in Jest's ESM mode (#2713).

CommonJS applications keep working through Node's `require(esm)` support (Node `^20.19.0 || ^22.12.0 || >=24.0.0`, already the declared engines range). Test runners that load `node_modules` through their own CommonJS runtime without ESM support, such as Jest without `--experimental-vm-modules`, can no longer load the package; stay on 6.x there or run Jest in ESM mode.
