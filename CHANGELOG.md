# Changelog

## Unreleased

### Added

- animated homepage hero scanner with a dark security-console treatment
- pre-install verdict panel on the report page
- repository trust metadata on GitHub imports
- install-surface map and dangerous-line evidence in repository audit reports
- working approval actions in the report UI

### Fixed

- homepage tab order now defaults to `GitHub Repo`
- report pages can recover from missing browser-local history by loading from server storage
- fresh environments bootstrap their SQLite tables automatically
- history page hydration issue caused by nested buttons
- export route now clearly serves print-friendly HTML for PDF-style export

## 0.1.0 - 2026-05-26

Initial public release of SkillShield with:

- 11-axis validation engine
- web UI for upload, GitHub import, and paste flows
- repository import support
- SARIF, JSON, and HTML exports
- AI review integration points
- approvals, audit logs, and webhook plumbing
