# SkillShield Architecture

## System Overview

SkillShield is a **full-stack Next.js 16 application** with a three-tier architecture: a React-based web frontend, RESTful API routes, and a modular validation engine. It also ships as a standalone GitHub Action for CI/CD integration.

```
┌─────────────────────────────────────────────────────────┐
│                     User / CI Pipeline                   │
└──────────┬──────────────────────────────┬───────────────┘
           │                              │
     Web Browser                    GitHub Actions
           │                              │
    ┌──────▼──────┐              ┌───────▼────────┐
    │  Next.js UI  │              │  Validate Skill │
    │  (React 19)  │              │  Action (Node) │
    └──────┬──────┘              └───────┬────────┘
           │                              │
    ┌──────▼─────────────────────────────▼────────┐
    │           Next.js API Routes                 │
    │   POST /api/validate   GET /api/validate     │
    │   GET  /api/report     POST /api/github      │
    └──────┬───────────────────────────────────────┘
           │
    ┌──────▼───────────────────────────────────────┐
    │            Validation Engine (lib/)           │
    │                                              │
    │  ┌──────────────┐  ┌─────────────────────┐   │
    │  │  Orchestrator │──▶ 11 Validation Axes  │   │
    │  └──────────────┘  └─────────────────────┘   │
    │         │                                     │
    │    ┌────▼─────┐  ┌──────────┐  ┌──────────┐  │
    │    │ Security  │  │ Parser   │  │ Report   │  │
    │    │ Scanner   │  │          │  │ Generator│  │
    │    └───────────┘  └──────────┘  └──────────┘  │
    │         │                                     │
    │    ┌────▼─────┐                               │
    │    │ Security │  (input validation, rate limit)│
    │    │ Modules  │                               │
    │    └──────────┘                               │
    └────────────────────────────────────────────────┘
```

---

## Validation Pipeline

The core validation flow is orchestrated by `lib/validator/orchestrator.ts`. It accepts a `SkillInput` JSON (files array with paths + content, optional name/source metadata) and returns a `ValidationResult`.

```
SkillInput (JSON / File Upload / GitHub URL / Paste)
         │
         ▼
┌─────────────────────┐
│  1. Parse Input      │  lib/parser/
│  - Frontmatter (YAML)│    frontmatter.ts
│  - Content (Markdown)│    skill-parser.ts
│  - File Tree         │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  2. Run Validators   │  Parallel via Promise.all (11 axes)
│                     │
│  ┌── Security ──────┤  lib/scanner/ (3 sub-layers)
│  │   (25%)          │    patterns.ts (100+ patterns, 12 categories)
│  │                  │    secrets.ts (14 secret types)
│  │                  │    obfuscation.ts (10 detection checks)
│  ├── Frontmatter ───┤  lib/validator/frontmatter.ts
│  │   (18%)          │    2 required, 7 recommended, unknown-field warn
│  ├── Quality ───────┤  lib/validator/quality.ts
│  │   (12%)          │    5 sub-dimensions: readability, completeness,
│  │                  │    clarity, examples, accessibility
│  ├── Structure ─────┤  lib/validator/structure.ts
│  │   (10%)          │    max depth 3, max size 10MB, binary checks
│  ├── Installation ──┤  lib/validator/installation.ts
│  │   (7%)           │    17 risk patterns: install scripts, Docker,
│  │                  │    system services, registry, Windows
│  ├── Naming ────────┤  lib/validator/naming.ts
│  │   (5%)           │    1–64 chars, lowercase+hyphens, 30+ reserved
│  ├── Tokens ────────┤  lib/validator/tokens.ts
│  │   (5%)           │    ~4 chars/token, 5000 limit, section breakdown
│  ├── Compatibility ─┤  lib/validator/compatibility.ts
│  │   (5%)           │    23 agents, 4 statuses (full/partial/unknown/incompatible)
│  ├── Content ───────┤  lib/validator/content.ts
│  │   (5%)           │    non-empty check
│  ├── Dependencies ──┤  lib/validator/dependencies.ts
│  │   (3%)           │    require()/import detection
│  └── BestPractices ─┤  lib/validator/best-practices.ts
│      (2%)           │    version + license keyword presence
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  3. Aggregate Scores │  Weighted average
│  - Per-axis scores   │  (weights sum to 1.0)
│  - Overall score     │  score = Σ(axis.score * weight)
│  - Risk level        │  critical > high > medium > low > safe
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  4. Generate Report  │  lib/report/report-data.ts
│  - 8 report sections │  (executive summary, security, quality,
│  - Recommendations   │   compatibility, tokens, findings, recs, tree)
│  - Export formats    │  PDF via lib/report/pdf.ts (HTML+print CSS)
└─────────┬───────────┘
          │
          ▼
    Store + Return
   (Map<string, Result> + localStorage)
```

---

## Security Scanner Architecture

The security scanner (`lib/scanner/`) performs three layers of analysis on every file in a skill package:

```
File Content
     │
     ▼
┌─────────────────────────────────────────────┐
│ Layer 1: Threat Pattern Matching            │
│  12 categories, 100+ patterns               │
│                                             │
│  ├─ Command Injection (16 patterns)         │
│  │   exec(), spawn(), child_process,        │
│  │   rm -rf /, curl|sh, PowerShell cradle   │
│  │   DROP TABLE, diskpart, /dev/sda         │
│  │                                          │
│  ├─ Data Exfiltration (12 patterns)         │
│  │   curl/wget POST to remote, netcat,      │
│  │   FTP upload, DNS exfil, env→URL         │
│  │                                          │
│  ├─ Credential Harvesting (12 patterns)     │
│  │   SSH keys, AWS creds, GCloud, .env,     │
│  │   /etc/passwd, /etc/shadow, browser      │
│  │                                          │
│  ├─ Prompt Injection (8 patterns)           │
│  │   "ignore previous instructions", DAN,   │
│  │   system prompt extraction, role-play    │
│  │                                          │
│  ├─ Obfuscation (12 patterns)               │
│  │   ROT13, hex, base64, layered encoding   │
│  │                                          │
│  ├─ Sensitive File Access (10 patterns)     │
│  │   .env, /etc/passwd, SSH, GPG, kube     │
│  │                                          │
│  ├─ External Calls (10 patterns)            │
│  │   curl/wget/fetch to external hosts,     │
│  │   DNS queries, IPFS, Tor                 │
│  │                                          │
│  ├─ Persistence (8 patterns)                │
│  │   cron, systemd, startup, scheduled tasks│
│  │                                          │
│  ├─ Social Engineering (7 patterns)         │
│  │   urgency, impersonation, fake errors    │
│  │                                          │
│  ├─ ClickFix Attack (5 patterns)            │
│  │   clipboard redirect, fake captcha,      │
│  │   Run/Dialog simulation                  │
│  │                                          │
│  ├─ Staged Malware (4 patterns)             │
│  │   download+execute, multi-stage payload  │
│  │                                          │
│  └─ Second-Order Injection (5 patterns)     │
│      template injection, log injection,     │
│      stored payload, delayed execution      │
└───────────────────┬─────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│ Layer 2: Hardcoded Secret Detection         │
│  14 rule types                              │
│                                             │
│  ├─ sk-* (OpenAI)            critical       │
│  ├─ sk-ant-* (Anthropic)     critical       │
│  ├─ AKIA* (AWS)              critical       │
│  ├─ ghp_/gho_/ghu_ (GitHub)  critical       │
│  ├─ -----BEGIN KEY-----      critical       │
│  ├─ postgres://mysql://...    critical       │
│  ├─ xox[baprs]-* (Slack)     critical       │
│  ├─ Discord tokens           critical       │
│  ├─ sk_live_/pk_live_ (Stripe) critical      │
│  ├─ JWT tokens               high           │
│  ├─ api_key/apikey values    high           │
│  ├─ password/secret values   critical/high  │
│  └─ generic secret/token vals  high         │
└───────────────────┬─────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│ Layer 3: Obfuscation Detection              │
│  10 detection checks                        │
│                                             │
│  ├─ Hex-encoded strings                     │
│  ├─ Base64 encoded strings                  │
│  ├─ Zero-width Unicode characters           │
│  ├─ Homoglyph substitution (Cyrillic,       │
│  │   fullwidth Latin)                       │
│  ├─ String reversal                         │
│  ├─ String.fromCharCode() abuse             │
│  ├─ Multiple encoding layers                │
│  ├─ eval/Function/setTimeout with encoded   │
│  ├─ Broken string concatenation             │
│  └─ Suspicious encoding density             │
└─────────────────────────────────────────────┘
```

---

## Data Flow

### Upload → Validation → Report

```
User Action              Server                     Client
───────────              ──────                     ──────
Upload skill
  │
  ├─ Drag & drop ─────── ▶  api/validate POST       Dropzone parses
  │                        │                         .md, .zip, .json
  ├─ GitHub URL ───────── ▶  api/github POST         UrlInput parses URL
  │                        │  → GitHub API fetch
  │                        │  → repository install-surface audit
  │                        │  → return files[] + repositoryAudit
  │                        │
  ├─ Paste ────────────── ▶  api/validate POST       textarea → SKILL.md
  │                        │
  │                        ├─ Generate ID (uuid)
  │                        ├─ Run 11-axis validation
   │                        ├─ Store result in SQLite (validation_results table)
   │                        └─ Return ValidationResult ── ▶  Render report page
  │                                                                
  │                                                  ┌──────────┐
  │                                                  │ Score    │
  │                                                  │ Gauge    │
  │                                                  ├──────────┤
  │                                                  │ Axes     │
  │                                                  │ Grid     │
  │                                                  ├──────────┤
  │                                                  │ Findings │
  │                                                  │ Table    │
  │                                                  ├──────────┤
  │                                                  │ Compat   │
  │                                                  │ Grid     │
  │                                                  ├──────────┤
  │                                                  │ Preview  │
  │                                                  ├──────────┤
  │                                                  │ Export   │
  │                                                  │ Buttons  │
  │                                                  └──────────┘
  │
  │  Export ─────────────────────────────────────── ▶  api/report?format=
  │                                                    json | html | pdf
  │
  └─ Save to history (localStorage key: skillshield_history)
```

---

## Component Architecture (Frontend)

```
layout.tsx (RootLayout)
├── Header / Nav (Home, History, Compare)
├── page.tsx (Home)
│   ├── Hero (shield icon + tagline)
│   ├── StatsBar (130K+ skills, 12 categories, 22+ agents)
│   ├── TabGroup (Upload Files | GitHub URL | Paste SKILL.md)
│   │   ├── Dropzone          (components/upload/dropzone.tsx)
│   │   ├── UrlInput          (components/upload/url-input.tsx)
│   │   └── Textarea + Validate button
│   └── StepsSection (1. Upload → 2. Scan → 3. Report)
├── validate/[id]/page.tsx (Report)
│   ├── ScoreGauge           (components/report/score-gauge.tsx)
│   │   SVG arc animated (180°, stroke-dasharray/dashoffset)
│   ├── AxesGrid             (11 axes, colored progress bars)
│   ├── FindingsTable        (components/report/findings-table.tsx)
│   │   Sortable, filterable by severity, expandable rows
│   ├── CompatibilityGrid    (components/report/compatibility-grid.tsx)
│   │   Responsive xl:grid-cols-6, status icons, hover tooltips
│   ├── SkillPreview         (body content in <pre>)
│   │   └── ExportBar        (components/report/export-bar.tsx)
│   │       JSON download, HTML download, PDF/Print, Copy Link
├── history/page.tsx
│   └── ValidationHistoryList (localStorage, clear button)
└── compare/page.tsx
    ├── Panel A (paste or load by ID)
    ├── Panel B (paste or load by ID)
    └── Comparison section (score diff, findings diff)
        (runs runFullValidation client-side)
```

---

## API Routes

All API routes implement rate limiting (30 requests/minute per IP).

### `POST /api/validate`

Validate a skill from JSON payload. Rate-limited under key `validate:{ip}`.

**Request body:** `SkillInput`
```json
{
  "name": "my-skill",
  "files": [
    { "path": "SKILL.md", "content": "# My Skill\n..." },
    { "path": "script.sh", "content": "echo hello" }
  ],
  "source": { "type": "upload" }
}
```

**Response:** `ValidationResult` — includes `overallScore`, `riskLevel`, `findings`, `axes`, `compatibility`, `tokenAnalysis`, `skillPreview`.

### `GET /api/validate?id=<id>`

Retrieve a previously validated result from the SQLite database.

### `GET /api/report?id=<id>&format=json|html|pdf`

Export a validation report. PDF is rendered as HTML with inline print CSS (served with `Content-Type: application/pdf`). Rate-limited under key `report:{ip}`.

### `POST /api/github`

Fetch skill files from a GitHub repository. Rate-limited under key `github:{ip}`.

**Request body:**
```json
{ "owner": "user", "repo": "repo-name", "path": "main/skills/my-skill" }
```

**Behavior:**
1. Resolves branch (branch detection or directory discovery)
2. Fetches the git tree recursively via GitHub API
3. Filters to text files (40+ extensions), max 200 files, 3MB each
4. Fetches raw content from `raw.githubusercontent.com`
5. Returns `{ files, owner, repo, branch, truncated }`

---

## State Management

| Layer | Strategy | File | Limits |
|-------|----------|------|--------|
| Server (persistent) | SQLite via Drizzle ORM (`lib/db/`) | `lib/db/schema.ts` | 5 tables: validation_results, rate_limits, audit_logs, approvals, webhooks |
| Client (persistent) | `localStorage` key `skillshield_history` | `lib/state.ts` | SSR-safe, deduplicates by id |

---

## Security Modules (`lib/security/`)

Two server-side security layers protect the API:

### `lib/security/input-validation.ts`

| Function | Purpose |
|----------|---------|
| `validateOwnerRepo()` | Sanitizes GitHub owner/repo slugs |
| `validateId()` | Validates UUID format |
| `validatePayloadSize()` | Checks total request body size (max 15MB) |
| `validateFiles()` | Validates file array (max 30 files, 3MB each, path traversal prevention, binary detection) |
| `isBinaryContent()` | Checks for null bytes in first 4096 bytes |
| `sanitizeError()` | Redacts URLs from error messages |

### `lib/security/rate-limit.ts`

| Feature | Detail |
|---------|--------|
| Default limit | 60 requests / 60-second window |
| Per-route limits | 30 req/min for validate, report, and GitHub endpoints |
| Cleanup | Stale entries purged every 60 seconds |
| Response | 429 with `Retry-After` header |

---

## GitHub Action Architecture

```
.github/actions/validate-skill/
├── action.yml          # Action metadata, inputs, outputs
├── index.js            # Node.js 20 entry point (zero npm deps)
└── package.json        # Minimal metadata
```

The action performs a **subset** of the full validation engine as a standalone script:

1. Reads the skill directory from the filesystem (via `fs` / `path`)
2. Validates SKILL.md existence
3. Parses YAML frontmatter, checks `name` and `description` fields
4. Scans for 10 dangerous patterns (simplified list):
   - `rm -rf /` (critical, command-injection)
   - `curl | sh` (critical, command-injection)
   - OpenAI API key (critical, secrets)
   - GitHub token (critical, secrets)
   - Private key (critical, secrets)
   - `exec()` (high, command-injection)
   - `child_process` (high, command-injection)
   - `eval()` (high, code-execution)
   - `.env` (medium, sensitive-file-access)
   - `localhost` (low, network)
5. Computes score (same formula: start 100, deduct per severity)
6. Outputs `score`, `risk-level`, `finding-count` as GitHub Actions outputs
7. Generates GitHub annotations (error/warning) and optional HTML report

---

## 11 Validation Axes (Detailed)

| # | Axis | Key | Weight | Score Range | Status Thresholds | Key Checks |
|---|------|-----|--------|-------------|-------------------|------------|
| 1 | Security | `security` | 25% | 0–100 | pass ≥90, warn ≥50 | 100+ patterns, 14 secrets, 10 obfuscation checks |
| 2 | Frontmatter | `frontmatter` | 18% | 0–100 | pass ≥80, warn ≥50 | Required: `name`, `description`; Recommended: 7 fields |
| 3 | Quality | `quality` | 12% | 0–100 | pass ≥70, warn ≥40 | Readability, completeness, clarity, examples, accessibility |
| 4 | Structure | `structure` | 10% | 0–100 | pass =100, warn ≥60 | Depth ≤3, size ≤10MB, binary placement |
| 5 | Installation | `installation` | 7% | 0–100 | pass =100, warn ≥40 | 17 risk patterns across install scripts/build files |
| 6 | Naming | `naming` | 5% | 0, 50, or 100 | pass =100, warn =50 | Length 1–64, `^[a-z0-9-]+$`, 30+ reserved names |
| 7 | Tokens | `tokens` | 5% | 0–100 | pass ≥90, warn ≥50 | ~4 chars/token, 5000 limit, section analysis |
| 8 | Compatibility | `compatibility` | 5% | 0–100 | pass ≥50, warn ≥20 | 23 agents, 4 statuses |
| 9 | Content | `content` | 5% | 0 or 100 | pass =100, fail =0 | Non-empty content check |
| 10 | Dependencies | `dependencies` | 3% | 80 or 100 | Always pass | `require()` / `import` detection |
| 11 | Best Practices | `bestPractices` | 2% | 70 or 100 | pass or warn | Version + license keyword presence |

**Score formula:** `overallScore = Math.round(Σ(axis.score × weight))`

**Risk level determination:** Scans findings for presence of severity levels in order: `critical` → `high` → `medium` → `low` → `safe` (default).

---

## Scoring Labels

| Score Range | Label |
|-------------|-------|
| 90–100 | Excellent |
| 80–89 | Good |
| 60–79 | Fair |
| 40–59 | Poor |
| 0–39 | Very Poor |

---

## Deployment

```
                   ┌──────────────┐
                   │  Vercel /    │
                   │  Docker /    │
                   │  Self-Host   │
                   └──────┬───────┘
                          │
              ┌───────────▼───────────┐
              │   Next.js Server      │
              │                       │
              │  API Routes   Pages   │
              │  (REST)       (SSR)   │
              └───────────────────────┘
```

* **Recommended**: Deploy on Vercel (zero-config for Next.js 16).
* **Alternative**: Docker container via `next start`.
* **CI/CD**: The GitHub Action runs in any Actions-enabled repository without a running server.
* **State**: SQLite database (via Drizzle ORM) persists validation results, rate limits, audit logs, approvals, and webhooks. Client-side history is still mirrored in localStorage.

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **SQLite with Drizzle ORM** | Persistent storage for validation results, rate limits, audit logs, approvals, and webhooks. Enables advanced features like history, approvals, and audit trails without external database setup. |
| **11 parallel validators** | Each axis runs independently via `Promise.all()`. Easy to add, remove, or rebalance axes by editing one orchestrator file and the weights table. |
| **Regex-based scanning** | Chosen over AST parsing for broad coverage across shell scripts, Python, JS, and markdown with minimal dependencies. ~2000 lines of patterns. |
| **Weighted scoring with security first** | Security gets 25% weight (highest) because preventing malicious skills is the primary value proposition. Quality and frontmatter follow as secondary. |
| **Installation risk as separate axis** | Install scripts (npm postinstall, curl|sh, Dockerfiles, system services) are a common attack vector. Dedicated 7% weight with 17 specific patterns. |
| **Standalone GitHub Action** | The action has its own minimal `index.js` (zero npm dependencies) rather than invoking the Next.js API, so it works without a running server. |
| **Rate limiting + input validation** | Two security modules (`lib/security/`) protect all API endpoints from abuse: per-IP rate limits (30 req/min), payload size caps (15MB), path traversal prevention, and binary content filtering. |
| **HTML-labeled-as-PDF** | The PDF export generates HTML with inline print styles and serves it as `application/pdf`. Keeps the dependency footprint small — no puppeteer or wkhtmltopdf required. |
| **Client-side comparison** | The `/compare` page imports and runs `runFullValidation()` directly in the browser, avoiding server round-trips and enabling offline comparison. |
| **localStorage history** | Zero server-side state for user history. The comparison feature reads directly from the client store. Deduplicates by validation ID. |

---

## Recent Additions

### `packages/core` Monorepo Structure

The codebase is organized as a monorepo with two packages under `packages/`:

```
packages/
├── core/           # @skillshield/core — shared scanner & validator engine
│   ├── src/
│   │   ├── scanner/       # patterns.ts, secrets.ts, obfuscation.ts
│   │   ├── validator/     # types.ts, scoring.ts
│   │   ├── parser/        # frontmatter.ts
│   │   └── index.ts       # re-exports
│   ├── package.json
│   └── tsconfig.json
└── cli/            # skillshield-cli — standalone CLI tool
    ├── src/
    │   └── index.ts       # commander-based CLI (scan, format, fail-on)
    ├── package.json       # dependencies: commander, chalk
    └── tsconfig.json
```

- **`@skillshield/core`** exports the scanner (patterns, secrets, obfuscation), validator types, scoring logic, and frontmatter parser. Used by both the Next.js API routes and the CLI.
- **`skillshield-cli`** is a standalone Node.js CLI using `commander` for command parsing and `chalk` for colored output. Supports `scan` with `--format` (json, html, sarif, markdown), `--fail-on`, `--output`, and `--policy` options.

### Policy Engine (`lib/policy/`)

Located at `lib/policy/`:

```
lib/policy/
├── engine.ts       # evaluatePolicy() — applies policy config against findings
├── parser.ts       # parsePolicy(), loadPolicy() — YAML parsing & validation
├── types.ts        # PolicyConfig, SeverityOverride, PolicyMode types
└── index.ts        # public exports
```

**Policy modes:**

| Mode | `failOn` | Secrets Blocked | Destructive Commands | Permission Manifest Required | Blocked Commands |
|------|----------|-----------------|----------------------|------------------------------|------------------|
| `default` | high | ✓ | ✓ | ✗ | — |
| `strict` | medium | ✓ | ✓ | ✓ | curl, wget, sudo, chmod, chown, rm -rf, eval |
| `enterprise` | low | ✓ | ✓ | ✓ | + ssh, telnet, nc, nmap |
| `custom` | per config | per config | per config | per config | per config |

**Key features:**
- Severity overrides by `ruleId` or `category`
- Domain allowlisting (`allowExternalDomains`)
- Command blocking (`blockedCommands`)
- File extension filtering (`allowedFileExtensions`)
- Finding blocking by title/ruleId (`blockedFindings`)
- Score penalty (5 points per violation)
- Detection of destructive commands (rm -rf, chmod 777, dd, mkfs, fdisk, format)

### Permission Manifest System (`lib/permissions/`)

Located at `lib/permissions/`:

```
lib/permissions/
├── manifest.ts     # extractPermissionManifest(), detectPermissionViolations(), extractDeclaredPermissions()
└── index.ts        # public exports
```

Extracts a permission manifest from `SKILL.md` content in three formats:
1. A dedicated `---permissions`/`---` block
2. Inline in YAML frontmatter under a `permissions` key
3. A standalone YAML block starting with `name:` + `permissions:`

**Permission domains:**

| Domain | Sub-keys | Detection |
|--------|----------|-----------|
| `filesystem` | `read`, `write` | Path references in content |
| `network` | `allow` | URL/domain extraction |
| `shell` | `allow`, `deny` | Dangerous command patterns (rm -rf, curl, wget, bash, chmod, chown, mkfs, dd, fork bombs) |
| `environment` | `allow`, `deny` | `process.env.*`, `${VAR}`, `env.VAR` references |

Violations are reported when detected usage exceeds declared permissions.

### Semgrep-Compatible Rules Engine (`lib/semgrep/`)

Located at `lib/semgrep/`:

```
lib/semgrep/
├── index.ts             # SemgrepRule type, parseSemgrepRules(), matchRule(), runSemgrepScan()
└── builtin-rules.ts     # 15 built-in security rules
```

**15 built-in rules (SS-prefixed IDs):**

| ID | Severity | Description |
|----|----------|-------------|
| SS-SHELL-001 | CRITICAL | `rm -rf /` |
| SS-SHELL-002 | CRITICAL | `curl \| sh` |
| SS-SHELL-003 | CRITICAL | `wget \| sh` |
| SS-SECRET-001 | CRITICAL | OpenAI API key |
| SS-SECRET-002 | CRITICAL | GitHub token |
| SS-SECRET-003 | CRITICAL | Private key |
| SS-FS-001 | ERROR | `fs.rmSync` recursive delete |
| SS-FS-002 | ERROR | `chmod 777` |
| SS-NET-001 | WARNING | External network request |
| SS-OBF-001 | ERROR | `eval` with encoded input |
| SS-OBF-002 | WARNING | `String.fromCharCode` obfuscation |
| SS-EXEC-001 | ERROR | `child_process.exec` |
| SS-EXEC-002 | ERROR | Python `subprocess` with `shell=True` |
| SS-ENV-001 | WARNING | Sensitive env access |
| SS-CODE-001 | ERROR | `eval()` |

**Features:**
- Supports `pattern`, `patternRegex`, `patternEither`, and `patternNot` fields
- File path include/exclude filters
- Matches any rule subset — custom rules can be loaded via `runSemgrepScan(content, path, rules)`
- Rules are exposed via `GET /api/semgrep-rules?format=json|yaml`

### Webhook System (`lib/webhooks/`)

Located at `lib/webhooks/index.ts`.

**Functions:**
- `triggerWebhooks(event, scanId, data)` — dispatches payload to all matching hooks
- `registerWebhook(url, events, secret)` — inserts a webhook into the database
- `listWebhooks()` — returns all registered hooks
- `deleteWebhook(id)` — removes a webhook

**Database table** (`lib/db/schema.ts`):

| Column | Type | Description |
|--------|------|-------------|
| `id` | text PK | UUID |
| `url` | text | Target URL |
| `events` | text | JSON array of event strings |
| `secret` | text? | Optional signing secret |
| `enabled` | boolean | Whether the hook is active |
| `createdAt` | integer | Unix timestamp |
| `lastTriggeredAt` | integer? | Last execution time |
| `lastStatusCode` | integer? | Last HTTP status code |

**Flow:**
1. Validation completes in `POST /api/validate`
2. If score < 70, a pending approval is created
3. `logAuditEvent('scan.completed', ...)` is called
4. `triggerWebhooks('scan.completed', ...)` sends payloads to all enabled hooks
5. Each webhook gets a 10-second timeout; failures are logged but don't break the response

### Approval Workflow (`lib/approvals/`)

Located at `lib/approvals/index.ts`.

**Functions:**
- `getApprovalForScan(scanId)` — fetch approval by scan ID
- `approveScan(scanId, reviewer?, notes?)` — mark as approved
- `rejectScan(scanId, reviewer?, notes?)` — mark as rejected
- `listApprovals(status?, limit?)` — list with optional filters
- `getPendingApprovalCount()` — count of pending approvals
- `createPendingApproval(scanId)` — auto-created for scans with score < 70

**Database table** (`lib/db/schema.ts`):

| Column | Type | Description |
|--------|------|-------------|
| `id` | text PK | UUID |
| `scanId` | text | Associated validation ID |
| `status` | enum | `pending` | `approved` | `rejected` |
| `reviewedBy` | text? | Reviewer name/identifier |
| `reviewNotes` | text? | Optional notes |
| `createdAt` | integer | Unix timestamp |
| `reviewedAt` | integer? | Unix timestamp of review |

### AI Review Module (`lib/ai-review/`)

Located at `lib/ai-review/index.ts`.

**Supported providers:** OpenAI, Anthropic, Google, OpenRouter.

**Configuration:** `AiReviewConfig` with `provider`, `apiKey`, `model?`, `redactSecrets`.

**Flow:**
1. `POST /api/ai-review` receives findings and skill name
2. Secrets are optionally redacted from snippets before sending
3. A structured prompt is built asking for executive summary, per-finding explanations, risk explanation, and remediation steps
4. The AI API is called (OpenAI `/chat/completions` or Anthropic `/v1/messages`)
5. Response is parsed from JSON or fallback markdown extraction
6. Returns `AiReviewResult` with `summary`, `riskExplanation`, `findingExplanations[]`, `remediationSteps`, `executiveSummary?`

**Fallback parsing:** If the AI response is not valid JSON, regex-based section extraction is used to parse markdown-formatted responses.

### Dark Mode Support

The application supports dark mode through Tailwind CSS v4's `dark:` variant and CSS custom properties defined in `app/globals.css`. Theme toggling is implemented with a `class` strategy (`.dark` class on `<html>`), persisted to localStorage. All UI components (`/components/`) include dark mode variants.

### New API Routes

In addition to the original four endpoints, the API now includes these routes:

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/policy` | POST | Evaluate findings against a `PolicyConfig` |
| `/api/approvals` | GET | List approvals (filter by scanId, status, limit) |
| `/api/approvals` | POST | Approve or reject a scan (action: `approve`/`reject`) |
| `/api/ai-review` | POST | Run AI-powered review of findings |
| `/api/webhooks` | GET | List registered webhooks |
| `/api/webhooks` | POST | Register a new webhook |
| `/api/webhooks` | DELETE | Delete a webhook by id |
| `/api/semgrep-rules` | GET | List built-in semgrep rules (json or yaml) |
| `/api/audit` | GET | Query audit logs (by event, with limit) |
| `/api/health` | GET | System health check (DB status, version, uptime, webhook count) |
| `/api/docs` | GET | OpenAPI 3.0 specification document |

All routes apply rate limiting with the same `checkRateLimit` middleware and return `X-RateLimit-*` headers.

### Database Schema (`lib/db/`)

The project now uses SQLite via `@libsql/client` with Drizzle ORM:

```
lib/db/
├── index.ts       # Database connection
└── schema.ts      # 5 tables: validation_results, rate_limits, audit_logs, approvals, webhooks
```

| Table | Purpose |
|-------|---------|
| `validation_results` | Persistent storage of validation results with TTL |
| `rate_limits` | Per-key rate limit tracking (count + reset timestamp) |
| `audit_logs` | Event-based audit trail |
| `approvals` | Approval workflow state |
| `webhooks` | Webhook registration and status |
