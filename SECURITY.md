# Security Policy

## Supported versions

Security fixes are released for the latest minor of the current major version.

| Version | Supported          |
| ------- | ------------------ |
| 6.x     | :white_check_mark: |
| < 6.0   | :x:                |

If you are on an older major, please upgrade before reporting — we will not
backport fixes, but we are happy to help you identify the upgrade path.

## Reporting a vulnerability

**Please do not open a public issue, discussion, or pull request for a
security problem.**

Report it privately through GitHub:

1. Go to the [Security tab](https://github.com/nestjs/throttler/security/advisories/new).
2. Fill in the advisory form.

This creates a private draft advisory visible only to you and the maintainers.
If you prefer, you can request a private fork from within the advisory to
develop and test a fix together.

If you cannot use GitHub for any reason, email <support@nestjs.com> instead.
Please say up front that the message concerns a security issue, and do not
include the details in a public thread anywhere else.

Please include:

- The affected version(s).
- A description of the weakness and the impact you believe it has.
- Reproduction steps or a proof of concept — a minimal Nest application is
  ideal.
- Any deployment details that matter (adapter, proxy configuration, storage
  backend).

## What to expect

- **Acknowledgement** within 5 business days.
- **An initial assessment** — whether we consider it a vulnerability, and a
  rough severity — within 10 business days.
- **Status updates** at least every 14 days while the report is open.

If we confirm the report, we will prepare a fix in the private advisory, assign
a CVE through GitHub, and publish the advisory alongside the release. We are
happy to credit you by name or handle — tell us how you would like to be
listed, or if you would rather not be.

We ask that you give us a reasonable window to ship a fix before disclosing
publicly. We do not run a bug bounty.

## Scope

This policy covers the `@nestjs/throttler` package in this repository.

A few notes on what is and is not in scope, based on how this package is
designed to be used:

- **Trusting the client address.** The built-in tracker uses `req.ip`. It is
  the application's responsibility to configure its HTTP adapter's proxy trust
  settings (for example Express's `trust proxy`) correctly. A deployment that
  trusts a client-supplied `X-Forwarded-For` header can be evaded regardless of
  what this package does; that is a misconfiguration, not a vulnerability here.
- **The in-memory storage.** `ThrottlerStorageService` is a single-process
  default intended for development and small deployments. It cannot coordinate
  limits across instances. Multi-instance deployments should use a shared
  storage backend.
- **Custom `getTracker` / `generateKey` implementations.** If you override
  these, the resulting keyspace is yours to reason about.

Reports about third-party community storage providers should go to those
projects.
