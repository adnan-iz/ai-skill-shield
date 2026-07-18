# SkillShield — AI Agent Skill Security Scanner

Validate AI agent skills and `SKILL.md` files before they run or install.

SkillShield is an open-source AI agent skill security scanner and `SKILL.md` validator. It reviews local skills and GitHub repositories for prompt injection, exposed secrets, dangerous commands, install scripts, dependency risks, and other software supply-chain signals before an agent runs or installs them.

![SkillShield AI agent skill security report showing a pre-install GitHub repository verdict](artifacts/ux-audit-2026-07-18/03-report-summary.png)

## AI agent skill security checks

- Validates skill packages across 11 axes, including security, structure, quality, compatibility, dependencies, and installation risk
- Audits GitHub repositories before import for lifecycle scripts, install scripts, registries, workflows, submodules, and related execution surfaces
- Highlights dangerous lines such as `curl | bash`, dynamic execution, custom registries, and install-time shell commands
- Produces a pre-install verdict with a checklist, repository trust metadata, and approval status
- Stores reports in SQLite and keeps browser-local history for quick revisit
- Exports JSON, HTML, print-friendly PDF HTML, and SARIF reports

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To enable AI review, copy `.env.example` to `.env.local` and set one supported provider key: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENCODE_GO_API_KEY`, or `OPENCODE_ZEN_API_KEY`.

Recommended flow:

1. Use the `GitHub Repo` tab on the homepage
2. Import a repository or skill path
3. Review the pre-install verdict and install-surface evidence on the report page

## Core workflows

### GitHub repository security scan

This is the main product workflow. The GitHub path:

- fetches repository files
- audits repository-level install surfaces before validation
- attaches trust metadata such as stars, forks, issues, license, and archive state
- returns a report with dangerous-line evidence and install-surface mapping

### Local AI skill validation

Upload a local skill package when you already have the files and want validator coverage without repository context.

### Paste `SKILL.md` for security review

Paste raw `SKILL.md` content for quick inspection. This is useful for authoring and spot-checking, but it does not provide repository-level install auditing.

## Security report and pre-install verdict

Each report includes:

- pre-install verdict: `Safe to Review`, `Needs Manual Review`, or `Do Not Install`
- score and risk summary
- 11-axis assessment cards in the UI
- repository audit panel for GitHub scans
- install-surface map and dangerous-line snippets
- findings table, AI review, compatibility grid, and `SKILL.md` preview
- approval status with approve/reject actions

## Tech stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Drizzle ORM
- SQLite by default

## Project layout

```text
app/                     Next.js routes and API handlers
components/              UI and report components
docs/                    Product and operational documentation
lib/                     Validation engine, report builders, storage, policy, security
packages/cli/            CLI package
packages/core/           Shared scanner and validator package
public/examples/         Example skill content
samples/                 Safe, suspicious, and malicious sample skills
tests/                   Vitest coverage
```

## Documentation

- [Architecture](ARCHITECTURE.md)
- [Roadmap](ROADMAP.md)
- [API reference](docs/api.md)
- [CLI reference](docs/cli.md)
- [Deployment guide](docs/deployment.md)
- [Enterprise notes](docs/enterprise.md)
- [Policy engine](docs/policy-engine.md)
- [Scoring model](docs/scoring.md)
- [GitHub Action](docs/github-action.md)

## Verification

```bash
npm run lint
npm run build
npm test
```

## Status

SkillShield is usable today as a local-first web app with GitHub import, repository auditing, approval tracking, exports, and history. Several enterprise features mentioned in older drafts are still planned rather than shipped; see the roadmap for the current priority list.
