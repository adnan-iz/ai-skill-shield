# SkillShield

Validate AI agent skills before they run or install.

SkillShield is a Next.js web app for pre-install review of `SKILL.md`-based skills and GitHub-hosted skill repositories. It combines multi-axis validation, install-risk scanning, repository execution-surface auditing, and exportable reports so you can decide whether a skill is ready to trust.

## What it does

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

Recommended flow:

1. Use the `GitHub Repo` tab on the homepage
2. Import a repository or skill path
3. Review the pre-install verdict and install-surface evidence on the report page

## Core workflows

### GitHub repo scan

This is the main product workflow. The GitHub path:

- fetches repository files
- audits repository-level install surfaces before validation
- attaches trust metadata such as stars, forks, issues, license, and archive state
- returns a report with dangerous-line evidence and install-surface mapping

### Direct upload

Upload a local skill package when you already have the files and want validator coverage without repository context.

### Paste `SKILL.md`

Paste raw `SKILL.md` content for quick inspection. This is useful for authoring and spot-checking, but it does not provide repository-level install auditing.

## Current report experience

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
