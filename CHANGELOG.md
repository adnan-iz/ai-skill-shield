# Changelog

## Unreleased

### Added

- Animated homepage hero scanner with a dark security-console treatment.
- Pre-install verdict panel on the report page.
- Repository trust metadata for GitHub imports.
- Install-surface map and dangerous-line evidence in repository audit reports.
- Approval actions in the report UI.

### Fixed

- The homepage now opens with the `GitHub Repo` tab selected.
- Report pages recover from missing browser-local history by loading from server storage.
- New environments create their SQLite tables automatically.
- Resolved a history-page hydration issue caused by nested buttons.
- The export route now clearly identifies print-friendly HTML used for PDF-style exports.

## 0.1.0 - 2026-05-26

Initial public release of SkillShield with:

- 11-axis validation engine.
- Web UI for upload, GitHub import, and paste workflows.
- Repository import support.
- SARIF, JSON, and HTML exports.
- AI review integration points.
- Approvals, audit logs, and webhook infrastructure.
