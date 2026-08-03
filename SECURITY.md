# Security Policy

## Reporting a vulnerability

Do not report security vulnerabilities through a public issue. Send a private report to **security@skill-shield.dev** or use the repository's **Report a vulnerability** option to open a private GitHub Security Advisory.

Include the affected version, reproduction steps, impact, and any suggested mitigation. We aim to acknowledge reports within 48 hours and provide an initial remediation timeline within seven days.

## Supported versions

Security fixes are applied to the latest release line.

| Version | Supported |
| --- | --- |
| `0.1.x` | Yes |
| Earlier versions | No |

## Current security controls

- Skill content is analyzed statically; AI Skill Shield does not execute submitted skill code.
- Validation requests enforce file-count, per-file, total-payload, path, and binary-content checks.
- Rate limits are stored server-side and applied per IP address.
- CI runs `npm audit` and GitHub CodeQL analysis.
- Finding snippets are redacted for common secret formats before configured AI review requests are sent to a provider.
- The minimum supported Node.js version is declared in `package.json`.

## Data handling

- Validation results are stored in SQLite or the configured libSQL-compatible database.
- Results that are not eligible for public GitHub trust pages receive a 30-day expiration timestamp. Public, commit-bound default-branch GitHub results are retained for trust-page lookups.
- Browser history is stored in the user's local storage for convenience.
- Database encryption is provided by the selected storage platform; AI Skill Shield does not add application-layer encryption at rest.
- When AI review is enabled, redacted finding data is sent to the configured provider. Review that provider's data-handling terms before enabling the feature.

## Request limits

The validation API currently accepts up to 30 files, 3 MB per file, and 15 MB for the complete request. Validation and GitHub import endpoints allow 30 requests per minute per IP; other rate-limited endpoints generally use a 60-request-per-minute default. Rate-limited responses include limit, remaining, and reset headers.
