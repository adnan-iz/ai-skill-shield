# SkillShield Architecture

## Overview

SkillShield is a full-stack Next.js 16 application built around one core job: decide whether an AI skill is safe to review or install.

The system has four major layers:

1. React pages and report UI
2. Next.js API routes for validation, GitHub import, approvals, reports, and audit queries
3. Validation and repository-audit libraries in `lib/`
4. SQLite-backed persistence for scan results, approvals, audit logs, and webhooks

## Main request flows

### 1. GitHub repo import

`POST /api/github`

This path is the most important flow in the app.

It:

- resolves branch or path
- fetches the repository tree from GitHub
- downloads install-surface candidates such as `package.json`, install scripts, `.npmrc`, `.gitmodules`, `requirements.txt`, and workflows
- runs `auditRepositoryTree()` to build repository findings, surfaces, and repo-level risk
- fetches scanable files for the selected skill path
- returns `files`, `repositoryAudit`, and `repositoryMeta`

### 2. Validation

`POST /api/validate`

This route:

- validates request size and file structure
- runs the full validator orchestrator
- stores the result in SQLite
- creates a pending approval when the score is below threshold
- writes audit events and triggers webhooks

### 3. Report rendering

`/validate/[id]`

The report page loads from browser-local history first and falls back to `GET /api/validate?id=...` when needed. It then renders:

- pre-install verdict
- approval status
- score and axis summaries
- repository audit details
- findings and evidence
- compatibility, AI review, and preview sections

## Validation engine

The orchestrator lives in `lib/validator/orchestrator.ts` and returns a `ValidationResult`.

Current axes:

- security
- frontmatter
- quality
- structure
- installation
- naming
- tokens
- compatibility
- content
- dependencies
- bestPractices

Each axis produces findings and a score. The orchestrator aggregates them into:

- overall score
- overall risk level
- summary counts
- compatibility matrix
- preview payload

## Repository audit engine

The repository audit lives in [lib/github/repository-audit.ts](</F:/agent skill validator/skill-shield/lib/github/repository-audit.ts>).

It identifies execution surfaces such as:

- GitHub Actions workflows
- `package.json` lifecycle scripts
- `install.*`, `setup.*`, and `bootstrap.*` scripts
- custom npm or Python registries
- submodules
- Dockerfiles
- systemd units

It also extracts dangerous evidence lines so the report can show exactly what triggered concern.

Output shape:

- repository summary counts
- install-surface map
- repo-level findings
- repo-level risk level

## Storage model

SQLite is the default runtime store.

Tables currently created on startup:

- `validation_results`
- `rate_limits`
- `audit_logs`
- `approvals`
- `webhooks`

Client-side history still uses `localStorage` for fast access in the browser, but server-side report retrieval is the durable fallback.

## UI architecture

Key report components:

- [components/report/install-verdict.tsx](</F:/agent skill validator/skill-shield/components/report/install-verdict.tsx>)
- [components/report/repository-audit.tsx](</F:/agent skill validator/skill-shield/components/report/repository-audit.tsx>)
- [components/report/findings-table.tsx](</F:/agent skill validator/skill-shield/components/report/findings-table.tsx>)
- [components/report/dashboard-cards.tsx](</F:/agent skill validator/skill-shield/components/report/dashboard-cards.tsx>)

Homepage behavior:

- `GitHub Repo` is the default tab
- the hero includes an animated scanner panel
- the scanner now reflects live scan state at a high level

## API surface

Primary routes:

- `POST /api/github`
- `POST /api/validate`
- `GET /api/validate?id=...`
- `GET /api/report`
- `GET/POST /api/approvals`
- `GET /api/audit`
- `GET/POST/DELETE /api/webhooks`
- `GET /api/health`
- `GET /api/docs`

## Trust and decision model

The app now treats "should I install this?" as a first-class question.

That decision is built from:

- validation risk level
- install-related findings
- repository audit findings
- repository trust metadata
- approval state

The result is rendered as a pre-install verdict:

- `Safe to Review`
- `Needs Manual Review`
- `Do Not Install`

## Current constraints

- GitHub repository trust metadata is available only for GitHub-based scans
- direct upload and paste flows cannot infer repo-wide install behavior
- PDF export is browser-print HTML, not a native server PDF renderer
- team workflows exist at the approval and webhook layer, but there is no full multi-user auth system yet
