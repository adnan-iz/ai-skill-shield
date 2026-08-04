# Security Scanner Rule Inventory

AI Skill Shield combines threat signatures, secret detection, obfuscation checks, Semgrep-compatible rules, and permission-manifest checks. The source files linked below are authoritative when this inventory and the implementation differ.

## Scanner layers

| Layer | Built-in checks | Source |
| --- | ---: | --- |
| Threat patterns | 109 | [`lib/scanner/patterns.ts`](../lib/scanner/patterns.ts) |
| Secret detection | 14 | [`lib/scanner/secrets.ts`](../lib/scanner/secrets.ts) |
| Runtime obfuscation checks | 13 | [`lib/scanner/obfuscation.ts`](../lib/scanner/obfuscation.ts) |
| Semgrep-compatible rules | 15 | [`lib/semgrep/builtin-rules.ts`](../lib/semgrep/builtin-rules.ts) |
| Permission-manifest checks | Context-dependent | [`lib/permissions/manifest.ts`](../lib/permissions/manifest.ts) |

## Threat pattern families

| ID prefix | Rules | Coverage |
| --- | ---: | --- |
| `CMD` | 16 | Command execution, destructive commands, unsafe permissions, and shell injection. |
| `DAT` | 12 | Network, file, environment, DNS, and email exfiltration patterns. |
| `CRD` | 12 | Credential files, environment secrets, browser stores, and database connection data. |
| `PIN` | 8 | Prompt overrides, jailbreaks, role-play bypasses, and prompt extraction. |
| `OBF` | 12 | Encoded commands, string reversal, hidden Unicode, and encoded execution. |
| `SFA` | 10 | Sensitive operating-system, cloud, source-control, and service files. |
| `EXT` | 10 | External downloads, remote execution, reverse shells, and binary retrieval. |
| `PER` | 8 | Startup entries, scheduled jobs, services, shell profiles, and other persistence mechanisms. |
| `SOC` | 7 | Fake updates, CAPTCHA instructions, security alerts, and other social-engineering patterns. |
| `CFX` | 5 | Click-fix and permission-bypass social engineering patterns. |
| `SML` | 4 | Staged-malware and delayed-payload patterns. |
| `SOI` | 5 | Delayed execution through hooks, configuration files, environment pollution, cron, and triggers. |

Each threat pattern returns at most one finding per scanned file. Findings include severity, category, file path, location, evidence, and a remediation recommendation when available.

## Secret detection

The built-in secret rules cover:

- OpenAI and Anthropic API keys
- AWS access and secret keys
- GitHub tokens
- JWTs and private keys
- Credential-bearing database URLs
- Slack and Discord tokens
- Stripe keys
- Generic API keys, passwords, and secrets

Markdown, text examples, and common fixture names receive limited false-positive suppression. Secret detection remains heuristic and should not replace repository-native secret scanning.

## Obfuscation checks

Runtime checks identify hex and Base64 strings, hidden Unicode, homoglyphs, string reversal, `String.fromCharCode`, multiple encoding layers, encoded execution through `eval`, timers or `Function`, broken string concatenation, and unusually dense encoding.

## Semgrep-compatible rules

| Rule family | Count | Coverage |
| --- | ---: | --- |
| `SS-SHELL-*` | 3 | Recursive deletion and pipe-to-shell downloads. |
| `SS-SECRET-*` | 3 | OpenAI keys, GitHub tokens, and private keys. |
| `SS-FS-*` | 2 | Recursive filesystem removal and world-writable permissions. |
| `SS-NET-*` | 1 | External network requests. |
| `SS-OBF-*` | 2 | Encoded execution and character-code construction. |
| `SS-EXEC-*` | 2 | JavaScript child processes and Python shell execution. |
| `SS-ENV-*` | 1 | Sensitive environment-variable access. |
| `SS-CODE-*` | 1 | Arbitrary execution through `eval`. |

These rules use local string and regular-expression matching; they do not invoke the external Semgrep engine.

## Severity and scoring

Semgrep-compatible severities map to AI Skill Shield severities as follows:

| Rule severity | AI Skill Shield severity |
| --- | --- |
| `CRITICAL` | `critical` |
| `ERROR` | `high` |
| `WARNING` | `medium` |
| `INFO` | `info` |

The security axis starts at `100` and deducts `50` per critical finding, `25` per high finding, `10` per medium finding, and `5` per low finding, with a minimum score of `0`. Informational findings do not reduce the security-axis score.

## Interpretation

Rules are static indicators, not proof of malicious intent or safety. Review the matched line and surrounding context before making an installation decision, especially for documentation, examples, and security tooling that may legitimately contain dangerous strings.
