# SkillShield 🔱

**Validate, score, and secure AI agent skills before they run.**

SkillShield is a comprehensive validation platform for the open Agent Skills ecosystem. It analyzes `SKILL.md`-based skill packages across **11 validation axes** — security, quality, structure, compatibility, installation risk, and more — before you run them in production.

[![CI](https://img.shields.io/github/actions/workflow/status/skill-shield/skill-shield/ci.yml?branch=main&label=build&logo=github)](https://github.com/skill-shield/skill-shield/actions)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen?logo=vitest)](https://github.com/skill-shield/skill-shield)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js_16-000?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)](https://typescriptlang.org)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?logo=tailwindcss&logoColor=fff)](https://tailwindcss.com)

---

## Quick Start

### Web UI

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Drag and drop a skill, paste a GitHub URL, or paste `SKILL.md` content directly.

### CLI

```bash
npx skillshield-cli scan ./my-skill
```

Or install globally:

```bash
npm install -g skillshield-cli
skillshield scan ./my-skill --format html --output report.html
```

### GitHub Action

```yaml
- uses: skill-shield/validate-skill@v1
  with:
    skill-path: ./skills/my-skill
    fail-on: high
    output-format: html
```

---

## Features

### 🔍 11-Axis Validation

| Axis | Weight | Description |
|------|--------|-------------|
| Security | 25% | 72 threat patterns, 14 secret types, obfuscation detection |
| Frontmatter | 18% | Required (`name`, `description`) and recommended YAML fields |
| Quality | 12% | Readability (Flesch score), completeness, clarity, examples, accessibility |
| Structure | 10% | Directory depth (max 3), total size (max 10MB), binary file placement |
| Installation Risk | 7% | Dangerous install scripts, Dockerfiles, system services, registry tampering |
| Naming | 5% | Name length (1–64), lowercase + hyphens, reserved name check, directory match |
| Tokens | 5% | Token estimation (~4 chars/token), 5000 token limit, section analysis |
| Compatibility | 5% | 23 agent detection patterns, MCP-compatible agent marking |
| Content | 5% | Non-empty content validation |
| Dependencies | 3% | Detection of `require()` / `import` usage |
| Best Practices | 2% | Version and license presence |

### 🛡️ Security Scanning

Three-layer analysis on every file in a skill package:

**Layer 1 — Threat Pattern Matching (72 patterns, 12 categories)**

| Category | Count | Examples |
|----------|-------|---------|
| Command Injection | 16 | `exec()`, `spawn()`, `rm -rf /`, `curl|sh`, PowerShell cradle |
| Data Exfiltration | 12 | `curl`/`wget` POST to remote, `netcat`, FTP upload, DNS exfil |
| Credential Harvesting | 12 | SSH keys, AWS creds, GCloud, `.env`, `/etc/passwd`, browser |
| Prompt Injection | 8 | "ignore previous instructions", DAN, system prompt extraction |
| Obfuscation | 12 | ROT13, hex, base64, homoglyphs, multi-layer encoding |
| Sensitive File Access | 10 | `.env`, `/etc/passwd`, SSH, GPG, kube config |
| External Calls | 10 | `curl`/`wget`/`fetch` to external hosts, DNS, IPFS, Tor |
| Persistence | 8 | `cron`, `systemd`, startup items, scheduled tasks |
| Social Engineering | 7 | Urgency, impersonation, fake errors |
| ClickFix Attack | 5 | Clipboard redirect, fake captcha, Run/Dialog simulation |
| Staged Malware | 4 | Download+execute, multi-stage payload |
| Second-Order Injection | 5 | Template injection, log injection, stored payload |

**Layer 2 — Secret Detection (14 types)**

| Type | Severity |
|------|----------|
| OpenAI (`sk-*`) | Critical |
| Anthropic (`sk-ant-*`) | Critical |
| AWS (`AKIA*`) | Critical |
| GitHub (`ghp_`/`gho_`/`ghu_`) | Critical |
| Private Keys (`-----BEGIN KEY-----`) | Critical |
| Database URLs (`postgres://`/`mysql://`) | Critical |
| Slack (`xox[baprs]-*`) | Critical |
| Discord tokens | Critical |
| Stripe (`sk_live_`/`pk_live_`) | Critical |
| JWT tokens | High |
| API keys / `apikey` values | High |
| Passwords / `secret` values | Critical/High |
| Generic secrets / tokens | High |

**Layer 3 — Obfuscation Detection (10 checks)**

Hex-encoded strings, base64, zero-width Unicode, homoglyph substitution (Cyrillic, fullwidth Latin), string reversal, `String.fromCharCode()` abuse, multi-layer encoding, `eval`/`Function`/`setTimeout` with encoded input, broken string concatenation, suspicious encoding density.

### 🤖 23 Agent Compatibility

Detects which AI agents a skill targets: Claude Code, OpenCode, Cursor, GitHub Copilot, Windsurf, Codex CLI, Cline, Amp, Goose, Manus, Replit Agent, Aider, Mistral Vibe, OpenClaw, Zed AI, JetBrains AI, Trae, Antigravity, Gemini CLI, Kiro, Roo, Continue, Sourcegraph Cody.

### 🔑 Permission Manifest System

Declare skill permissions in `SKILL.md` and detect violations:

```yaml
name: my-skill
permissions:
  filesystem:
    read:
      - /tmp
      - ./data
    write:
      - ./output
  network:
    allow:
      - api.openai.com
  shell:
    allow:
      - echo
      - ls
    deny:
      - rm
      - curl
  environment:
    allow:
      - PATH
      - HOME
    deny:
      - AWS_SECRET_ACCESS_KEY
```

The engine extracts the manifest and cross-references declared permissions against detected usage across filesystem, network, shell, and environment domains.

### 📜 Policy Engine

Four built-in modes with custom overrides:

| Mode | `failOn` | Secrets Blocked | Destructive Commands Blocked | Permission Manifest Required |
|------|----------|-----------------|------------------------------|------------------------------|
| Default | High | ✓ | ✓ | ✗ |
| Strict | Medium | ✓ | ✓ | ✓ |
| Enterprise | Low | ✓ | ✓ | ✓ |
| Custom | Configurable | Configurable | Configurable | Configurable |

Features: severity overrides, domain allowlisting, command blocking, file extension filtering, score penalty adjustments.

### ⚙️ Semgrep-Compatible Rules Engine

15 built-in security rules with CRITICAL, ERROR, and WARNING severity levels. Rules cover shell injection, secret exposure, filesystem abuse, network requests, obfuscation, code execution, and environment variable access. Export rules as JSON or YAML via the API. Write and load custom rulesets.

### 🧠 AI Review (Level 5)

Connect your OpenAI or Anthropic API key for natural-language analysis:

- **Executive summary** of skill risk posture
- **Per-finding explanations** with risk rationale
- **Code suggestions** for fixing vulnerabilities
- **Remediation steps** prioritized by severity
- **Secret redaction** before sending to AI (configurable)

Providers supported: OpenAI (`gpt-4o-mini`), Anthropic (`claude-3-haiku`), Google, OpenRouter.

### ✅ Approval Workflow

Scans scoring below 70 automatically create pending approval requests. Approve or reject with reviewer name and notes. Full audit trail via the database.

### 🔔 Webhook System

Register webhooks for real-time event notifications:

| Event | Description |
|-------|-------------|
| `scan.completed` | Fired after validation finishes |
| `scan.failed` | Fired on validation error |
| `*` | Wildcard — fire on all events |

Payload includes score, risk level, skill name, findings count, and source URL.

### 📊 Export Formats

| Format | CLI | API | Description |
|--------|-----|-----|-------------|
| JSON | ✓ | ✓ | Full data structure |
| HTML | ✓ | ✓ | Printable styled report |
| PDF | ✗ | ✓ | Print-optimized HTML served as PDF |
| SARIF | ✓ | ✓ | SARIF v2.1.0 (GitHub, VS Code compatible) |
| CSV | ✗ | ✗ | (Planned) |
| Markdown | ✓ | ✗ | Lightweight text report |

### 🌐 Web UI

- Drag-and-drop upload, GitHub URL import, paste `SKILL.md` directly
- GitHub repository pre-install audit for workflows, lifecycle scripts, install scripts, registries, and submodules
- Interactive reports with animated score gauge
- Sortable, filterable findings table
- Agent compatibility grid with status indicators
- Validation history with localStorage persistence
- Side-by-side skill comparison tool
- Policy configuration playground (`/rules`)
- Dark mode support

---

## CLI Usage

```bash
# Scan a skill directory
skillshield scan ./path/to/skill

# Scan with HTML output
skillshield scan ./path/to/skill --format html

# Scan and write to file
skillshield scan ./path/to/skill --format sarif --output report.sarif

# Fail only on critical issues
skillshield scan ./path/to/skill --fail-on critical

# Apply a policy file
skillshield scan ./path/to/skill --policy .skillshield-policy.yml

# Exit codes: 0 = pass, 1 = fail (risk exceeds threshold)
```

### Scan Result Severity Thresholds

| `--fail-on` | Risk Level Required to Fail |
|-------------|----------------------------|
| `critical` | Critical only |
| `high` | Critical or High (default) |
| `medium` | Critical, High, or Medium |
| `low` | Any finding |

---

## GitHub Action

```yaml
# .github/workflows/validate-skill.yml
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: skill-shield/validate-skill@v1
        with:
          skill-path: ./skills/my-skill
          fail-on: high
          output-format: html
```

**Inputs:**

| Input | Default | Description |
|-------|---------|-------------|
| `skill-path` | `./` | Path to the skill directory containing `SKILL.md` |
| `fail-on` | `high` | Minimum severity to fail (`critical`, `high`, `medium`, `low`) |
| `output-format` | `json` | Report format (`json` or `html`) |

**Outputs:**

| Output | Description |
|--------|-------------|
| `score` | Overall validation score (0–100) |
| `risk-level` | Risk classification (`safe`, `low`, `medium`, `high`, `critical`) |
| `finding-count` | Total number of findings |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/validate` | Run full validation on skill files |
| GET | `/api/validate?id=<id>` | Retrieve stored validation result |
| GET | `/api/report?id=<id>&format=<fmt>` | Export report (json, html, pdf, sarif) |
| POST | `/api/github` | Fetch skill files from a GitHub repository |
| POST | `/api/policy` | Evaluate findings against a policy config |
| GET | `/api/approvals` | List approvals (filter by status, scanId, limit) |
| POST | `/api/approvals` | Approve or reject a scan |
| POST | `/api/ai-review` | Run AI-powered review of findings |
| GET | `/api/webhooks` | List registered webhooks |
| POST | `/api/webhooks` | Register a new webhook |
| DELETE | `/api/webhooks?id=<id>` | Delete a webhook |
| GET | `/api/semgrep-rules?format=<fmt>` | Get built-in semgrep rules (json, yaml) |
| GET | `/api/audit?event=&limit=` | Query audit log entries |
| GET | `/api/health` | Health check with DB status |
| GET | `/api/docs` | OpenAPI 3.0 specification |

All endpoints implement rate limiting (30 requests/min per IP by default) with `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers.

---

## Web UI Routes

| Route | Description |
|-------|-------------|
| `/` | Upload skills via drag-and-drop, GitHub URL, or paste |
| `/validate/[id]` | Detailed validation report with score, findings, exports |
| `/history` | Browse and manage past validations (localStorage) |
| `/compare` | Side-by-side comparison of two skills |
| `/rules` | Policy configuration playground |

GitHub-backed validations also include a repository audit section in the report so you can review install-time execution surfaces before trusting the imported skill.

---

## Policy Engine

```yaml
# .skillshield-policy.yml
mode: strict
failOn: medium
blockSecrets: true
blockDestructiveCommands: true
requirePermissionManifest: true
allowExternalDomains:
  - api.openai.com
blockedCommands:
  - curl
  - wget
  - sudo
maxFileSizeMB: 5
maxFiles: 50
severityOverrides:
  - category: "network"
    overrideSeverity: "low"
    reason: "Network calls reviewed separately"
allowedFileExtensions:
  - .md
  - .py
  - .js
  - .ts
  - .sh
blockedFindings:
  - "curl pipe to shell"
```

Apply via CLI: `skillshield scan ./skill --policy .skillshield-policy.yml`
Apply via API: `POST /api/policy` with findings, score, and policy config.

---

## Project Structure

```
skill-shield/
├── app/                          # Next.js App Router
│   ├── api/                      # REST API routes (12 endpoints)
│   ├── validate/[id]/            # Validation report page
│   ├── history/                  # Validation history
│   ├── compare/                  # Side-by-side comparison
│   └── rules/                    # Policy playground
├── components/                   # React components
│   ├── report/                   # Score gauge, findings table, compatibility grid
│   ├── upload/                   # Dropzone, URL input
│   ├── comparison/               # Comparison panels
│   ├── ui/                       # Toast, shared UI primitives
│   └── layout/                   # Header, nav, layout components
├── packages/
│   ├── core/                     # @skillshield/core — scanner, validator, parser
│   └── cli/                      # skillshield-cli — command-line tool
├── lib/
│   ├── validator/                # 11-axis validation engine
│   ├── scanner/                  # Security scanner (patterns, secrets, obfuscation)
│   ├── security/                 # Input validation, rate limiting
│   ├── parser/                   # SKILL.md frontmatter & content parsing
│   ├── report/                   # Report generation (JSON, HTML, PDF, SARIF)
│   ├── policy/                   # Policy engine (eval, parsing, types)
│   ├── permissions/              # Permission manifest extraction & violation detection
│   ├── webhooks/                 # Webhook registration & dispatch
│   ├── ai-review/                # AI-powered finding review (OpenAI, Anthropic)
│   ├── approvals/                # Approval workflow
│   ├── semgrep/                  # Semgrep-compatible rules engine
│   ├── db/                       # Drizzle ORM schema & connection
│   ├── state.ts                  # Client-side state (localStorage)
│   ├── store.ts                  # Server-side in-memory store
│   ├── api-error.ts              # API error response helpers
│   ├── logger.ts                 # Structured logging
│   └── env.ts                    # Environment configuration
├── tests/                        # Test suite (Vitest)
├── public/                       # Static assets & example skills
├── .github/actions/validate-skill/  # GitHub Action (zero npm deps)
└── .github/workflows/ci.yml      # CI pipeline
```

---

## Scoring & Risk

| Score | Label | Risk Level | Criteria |
|-------|-------|------------|----------|
| 90–100 | Excellent | Safe | No findings above `low` severity |
| 80–89 | Good | Low | No findings above `medium` |
| 60–79 | Fair | Medium | Contains `medium` findings |
| 40–59 | Poor | High | Contains `high` findings |
| 0–39 | Very Poor | Critical | Contains `critical` findings |

**Formula:** `overallScore = Math.round(Σ(axis.score × weight))` where weights sum to 1.0.

---

## Screenshots

> _Home page with upload tabs — coming soon_

> _Validation report with score gauge and findings table — coming soon_

> _Compatibility grid showing agent support — coming soon_

---

## Documentation

- [Architecture](ARCHITECTURE.md) — System design, data flow, component tree
- [API Docs](https://api.skill-shield.dev) — OpenAPI 3.0 specification at `/api/docs`
- [Contributing](CONTRIBUTING.md) — Development setup, PR process, code style
- [Security](SECURITY.md) — Security policies, reporting vulnerabilities
- [Code of Conduct](CODE_OF_CONDUCT.md) — Community guidelines
- [Changelog](CHANGELOG.md) — Release history
- [Roadmap](ROADMAP.md) — Planned features

---

## Development

```bash
npm run dev        # Start dev server (localhost:3000)
npm run build      # Production build with TypeScript check
npm run start      # Start production server
npm run lint       # Run ESLint
npm run typecheck  # Run TypeScript type checking
npm test           # Run Vitest test suite
npm run coverage   # Run tests with coverage
npm run test:watch # Watch mode
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4 |
| Language | TypeScript (strict) |
| Database | SQLite via libSQL + Drizzle ORM |
| Validation | Zod |
| Markdown | `marked` |
| YAML | `yaml` with failsafe schema |
| CLI | `commander` + `chalk` |
| PDF | HTML with print CSS (served as `application/pdf`) |
| Testing | Vitest |

---

## License

[MIT](LICENSE) — See [LICENSE](LICENSE) for the full text.
