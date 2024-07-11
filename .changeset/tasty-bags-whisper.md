---
'@nestjs/throttler': major
---

- e17a5dc: The storage has been updated to utilize Map instead of a simple object for key-value storage. This enhancement offers improved performance, especially for scenarios involving frequent additions and deletions of keys. There is a breaking change at the library level. Storage library owners will be affected by this breaking change
