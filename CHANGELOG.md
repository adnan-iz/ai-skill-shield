# Changelog

Notable changes to AI Skill Shield are documented here.

## 2.0.0 - 2026-09-06

### Added
- **MCP Tool Schema Scanner** (`lib/mcp/`): Comprehensive tool poisoning scanner detecting system prompt injection, precedence hijacking, unconstrained dangerous parameter schemas, and implicit write actions.
- **Capability Drift Analyzer** (`lib/scanner/capability-drift.ts`): Reconciles static frontmatter permissions against static code reality, surfacing undeclared filesystem, network, process execution, and sensitive env var operations.
- **Token Economics & KV-Cache Profiler** (`lib/validator/token-economics.ts`): Multi-model cost estimator (Claude 3.5 Sonnet, GPT-4o, Gemini Flash) and KV-cache prefix alignment analyzer.
- **Install Command Risk Analyzer** (`lib/scanner/command-analyzer.ts`, `/api/analyze-command`): Detects pipe-to-shell, elevated execution (`sudo`/`doas`), dangerous package flags, obfuscated payloads, and unsafe protocols.
- **SkillBOM CycloneDX 1.5 Generator** (`lib/sbom/`): Generates machine-readable Software Bill of Materials in CycloneDX 1.5 JSON tailored for AI agent skills and tools.
- **Token Economics & MCP Tool UI Cards** (`components/report/token-economics-card.tsx`, `components/report/mcp-tools-card.tsx`): Interactive dashboard visual components for cache efficiency and tool health.
- **Adversarial Prompt Fuzzing Harness** (`lib/fuzzing/`): Automated 21-vector red-teaming harness testing instruction extraction, delimiter breakouts, roleplay overrides, and safety evasion.
- **Language Server Protocol (LSP) Diagnostics & QuickFix Engine** (`lib/linter/`): LSP diagnostics with automated inline remediation quick fixes for IDEs (VS Code, Cursor, Zed).
- **Runtime MCP Gateway Proxy & Interceptor** (`lib/proxy/`): Real-time interceptor evaluating `tools/call` requests with path traversal prevention, shell injection blocking, and DLP secret redaction.
- **Ed25519 Cryptographic Signing & Verification Engine** (`lib/signing/`): Canonical SHA-256 package digests, asymmetric Ed25519 digital signatures, and tamper detection with `---signature` block support.
- **Enterprise Governance & Multi-Role Approval Chain** (`lib/governance/`): Multi-signature state machine supporting Developer, Security Auditor, Compliance Officer, and Admin approval policies.
- **Server-Sent Events (SSE) Live Scan Streaming Pipeline** (`lib/events/scan-stream.ts`, `/api/validate/stream`): Real-time progressive scan streaming emitting incremental progress and finding events.
- **Runtime Sandbox Isolation Runner** (`lib/sandbox/`): Isolated context runtime environment intercepting network, filesystem writes, and process execution with memory and execution timeout limits.
- **Skill Diff & Permission Escalation Engine** (`lib/diff/`): Granular semantic diff engine identifying risk deltas, score regression, permission escalation, and MCP schema modifications between skill versions.
- **Golden Skill Registry & Enterprise Catalog API** (`lib/registry/`, `/api/registry`): Enterprise catalog supporting cryptographically verified publishing, semantic filtering, tagging, and lifecycle deprecation.

## 0.2.0 - 2026-08-02

### Added

- Pre-install GitHub repository audits covering package lifecycle scripts, custom registries, workflows, submodules, and other execution surfaces.
- Combined reports for repositories containing multiple skills, with each `SKILL.md` validated independently.
- Install verdicts: `Safe to Review`, `Needs Manual Review`, and `Do Not Install`.
- Repository trust metadata, install-surface maps, and dangerous-line evidence with file and line references.
- Public trust pages and badge endpoints for eligible public GitHub scans.
- Approve and reject actions for recorded scan decisions.
- Optional AI review through OpenAI, Anthropic, OpenCode Go, and OpenCode Zen.
- An installable CLI tarball attached to the GitHub release.

### Changed

- Made the hosted scanner the primary quick-start path; standard scans require no installation, account, or API key.
- Redesigned the homepage around GitHub repository scanning and pre-install review.
- Improved report recovery by loading saved server results when browser-local history is unavailable.
- Renamed the default branch from `v2.00-dev` to `master`.
- Clarified that PDF-style export is print-friendly HTML rather than a native PDF file.

### Fixed

- Scanning for large and oversized GitHub repositories, including batched downloads, prioritized file selection, and interrupted-download retries.
- Discovery and combined analysis of every skill in multi-skill repositories.
- GitHub, raw GitHub, nested repository, and `skills.sh` path resolution.
- Verdict thresholds, repository audit results, and canonical site URLs.
- Automatic SQLite table creation in new environments.
- A history-page hydration error caused by nested interactive elements.
- CI and security workflows not running against the real default branch.
- Removed committed development-server logs and ignored nested dependency directories and error logs.

### Security

- Updated Next.js to 16.2.12 and pinned Sharp to a patched release.
- Enabled passing dependency audit and CodeQL analysis workflows on `master`.
- Verified the release with lint, typecheck, 112 tests, a production build, dependency audit, and CodeQL.

## 0.1.0 - 2026-05-26

### Added

- Initial 11-axis validation engine.
- Web workflows for file upload, GitHub import, and pasted `SKILL.md` content.
- JSON, HTML, print-friendly HTML, and SARIF reports.
- Initial AI review, approval, audit log, webhook, policy, and scoring infrastructure.
