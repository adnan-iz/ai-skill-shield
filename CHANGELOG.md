# Changelog

Notable changes to AI Skill Shield are documented here.

## Unreleased

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
