# Scanner completeness and depth implementation plan

> **For agentic workers:** Use subagent-driven development for independent scanner integrations, with integration review in the parent task.

**Goal:** Implement the additions approved from the Skillspector comparison audit.
**Architecture:** Preserve existing web validation and immutable reviews. Share security scanning with local/CI entry points; persist coverage; add bounded external checks and opt-in content review. Use Skillspector for deeper AST, data-flow, signatures, nested artifact, and linked-source analysis instead of duplicating that engine.
**Tech Stack:** Next.js 16.3, TypeScript, Node.js, existing YAML and esbuild dependencies, optional Python Skillspector worker.
**Spec:** `docs/audits/2026-10-14-skillspector-comparison.md`

## Constraints

- Preserve existing user changes and stored reports. Unknown old coverage requires review.
- Never execute scanned code. Never silently treat failed checks as clean.
- Keep source bytes, paths, findings, rule versions and scope inspectable.
- Do not publish packages or deploy without a separate request.

## Tasks

- [x] Coverage and batch ingestion: add failing helper-file and incomplete-verdict tests; group skill directories with existing scoping; persist bounded skip evidence; update cache identity, reports and trust verdicts.
- [x] Dependency advisories: add tests for exact versions, ranges, lookup failure and caching; implement bounded OSV queries; include status in validation reports.
- [x] Shared local scanner and baselines: use existing scanner rules through one export; bundle CLI/Action with installed esbuild; bound local reads; add source/version-bound accepted baselines and CLI exit policy; verify equivalent security fixtures.
- [x] Agent tool: implement local stdio MCP scan tool through the shared CLI engine; validate JSON-RPC/tool input and document installation.
- [x] Deep scanner and AI discovery: integrate optional pinned Skillspector subprocess using temporary files and time/output limits; validate results and preserve separate scores; add opt-in bounded source discovery with validated locations; expose controls on existing report flow.
- [x] Verification: run targeted regression tests, typecheck, lint, CLI/Action builds, MCP smoke, and full tests; independently review changes and fix issues before reporting.

Each task writes and runs regression tests before implementation and records its validation. Integration stays in the current checkout because the existing report/upload UI changes are part of the approved working state.

## Verification record

- Final full test run: 490 passed, 14 environment-dependent cases skipped. Scoped regression run: 87 passed, one environment-dependent case skipped.
- Root, CLI and core typechecks passed. Lint passed with existing unrelated warnings.
- Production build passed with database access disabled for verification; both new API routes were included.
- CLI and Action standalone bundles rebuilt; subprocess tests exercised CLI findings, baseline decisions, Action severity thresholds and MCP initialization/tool calls.
- Installed pinned SkillSpector 2.12.0 in ignored `.tools/skillspector`; real static adapter smoke returned risk 74, three findings including critical TT3 data flow. Local `.env.local` pin settings configured without exposing other settings.
- Independent review findings fixed: ingestion memory budget, Explorer coverage trust, advisory deduplication, full PEM redaction, explicit MCP verdict and actual/recursive upstream output compatibility. Known upstream recursive omissions are guarded against the stored manifest inventory.
- No publishing, production deployment, live database migration, or live AI provider calls performed.
