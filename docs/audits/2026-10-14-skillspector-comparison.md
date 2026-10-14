# SkillSpector versus Skill Shield

Audit date: 2026-10-14. Scope: capability comparison and implementation priorities, not a complete security assessment or detection benchmark. Assumed usage: hosted public scans, local developer scans, and CI install checks.

SkillSpector is a Python security scanner for agent skill bundles. Skill Shield is a web-first skill validation and review product. The strongest opportunity is to improve Shield's scan completeness and detection depth while retaining its existing reports, repository audit, compatibility checks, and owner-review workflow.

## Evidence inspected

- NVIDIA source snapshot: `8b993d32eb66c88496eb5aa5088530ac8b9214d5`, downloaded to `artifacts/skillspector-audit-source/`.
- Shield base commit: `86747d19d89882e6d1f6c1c9e08b111a6bf8e4b5`, plus the existing working-tree changes. No application code was changed for this audit.
- Shield's existing graph was queried, but returned little relevant scanner detail. Conclusions below use current source files rather than the graph.
- Sources: NVIDIA's README, analyzer implementations, CLI, MCP server, nested-artifact and transitive scanning modules, resource-bound documentation, and suppression documentation; Shield's scanner, orchestrator, GitHub importer, CLI, Action, report verdict, AI review, review identities, and targeted tests.
- Validation: 45 tests passed across seven suites covering batch aggregation, security patterns, Semgrep-style rules, MCP schemas, install decisions, review identities, and SARIF. The sandbox initially prevented test startup; the successful rerun used normal host execution.

## Capability comparison

| Capability | SkillSpector | Skill Shield today | Assessment |
|---|---|---|---|
| Prompt injection, exfiltration, dangerous commands, secrets | Static analyzers and optional semantic review | Static patterns, dedicated secret scanner, obfuscation checks | Substantial overlap. Rule counts do not establish which detects more threats. |
| Structural code analysis | Python AST, including aliases and reflective calls | Text matching in `lib/semgrep/index.ts`; capability drift is also pattern based | Missing true code parsing in the standard scan. NVIDIA's deeper analysis is Python focused, not universal. |
| Data-flow analysis | Python sources to dangerous destinations, including direct same-file function calls | No taint-tracking implementation found | Missing. Useful for secret-read-to-network and downloaded-code-to-execution chains. |
| Known dependency vulnerabilities | OSV queries for dependency coordinates, cache and limited offline fallback | Dependency mention check plus installation and repository supply-chain heuristics | Missing live advisory lookup, not missing all supply-chain checks. |
| Malware signatures | YARA engine and bundled/custom signatures | Text patterns and encoding heuristics | Missing a signature engine. |
| Incomplete analysis evidence | Artifact inventory, inspection ledger, coverage metrics, strict exit gates | File/payload caps and GitHub warnings; no common completeness field in `ValidationResult` | Partial. Limits exist, but verdicts do not consume a complete coverage record. |
| Multiple skills in one repository | Recursive/multiple-skill scanning with omission accounting | Batch aggregation exists, but each skill scan receives only its manifest | Major gap in supporting-file coverage. |
| Embedded content | Bounded local ZIP-compatible container inspection and content classification | Text-file input model; no nested-container inspector found | Missing inspection of concealed executable members and opaque artifact inventory. |
| Linked external sources | Optional transitive traversal with bounded depth, targets, bytes, and allow/deny prefixes | Flags download/execution patterns; does not recursively inspect linked payloads | Missing optional follow-up scanning. |
| AI security discovery | Semantic analyzers inspect eligible contents for risks static patterns missed; deterministic findings remain | Standard AI endpoint explains a sample of existing findings; separate evidence-based appeal adjudication | Partial. Explanation and adjudication are present; general full-content discovery is not equivalent. |
| Accepted findings | Version/source-bound fingerprint baselines and glob suppression rules | Immutable original scans and approved, scan-scoped review projections | Partial. Reusable local/CI baselines are missing; human review is already present. |
| MCP analysis | Least privilege, poisoning, rug-pull analyzer, registry snapshot comparison | Tool schema checks, poisoning patterns, permission drift, version comparison including tool changes | Partial. Registry-specific snapshot comparison and broader analyzer coverage remain additions. |
| Agent integration | MCP `scan_skill` tool; Pi/OpenCode integrations | HTTP API and source CLI; no agent-callable MCP server found | Missing an install-check tool agents can call directly. |
| Local/CI scanner consistency | CLI/MCP invoke the scanner graph | CLI and Action each use a separate compact ruleset | Existing interfaces need stronger parity, not replacement interfaces. |
| Reports | Terminal, JSON, Markdown, SARIF | Web reports, JSON, HTML/print, SARIF, markdown-oriented routes | Already covered in large part. |
| Product workflow | Scanner and integration focus | Hosted UI, 11 validation axes, explorer/trust pages, badges, GitHub owner notifications, approved appeals | Shield has useful product scope beyond the scanner. Deployment reliability was not assessed. |

## Fix first

### 1. Include supporting files in multi-skill scans

Evidence: `app/api/github/route.ts:284` selects only skill entry blobs in batch mode. Independently, `lib/validator/orchestrator.ts:200` calls validation with `files: [{ path: 'SKILL.md', content: skillFile.content }]`.

Concrete case: a repository contains two benign manifests, but one skill has a malicious `scripts/install.py`. The batch security scan never sees that helper. Repository install-surface auditing provides separate signals but is not a substitute for scanning that script's content.

Smallest complete change: fetch and group each skill's supporting files using the existing directory scoping helper; exclude nested skills from parent groups; validate each group once. Preserve aggregate input limits and bounded concurrency. Add a regression fixture with a harmless manifest and dangerous helper, and check single-skill/batch agreement.

Reach: GitHub file selection/import, batch orchestrator, payload limits, batch preview, batch tests, importer tests. Treat large-repository omissions explicitly rather than raising limits without accounting.

### 2. Make incomplete scans affect the result and verdict

Evidence: the GitHub importer discards failed fetches and oversized files at `app/api/github/route.ts:314`. Its `truncated` flag is calculated from selection and total-size trimming, so those individual failures are not fully accounted for. Batch mode rejects missing manifest fetches, but ordinary scans lack the same guarantee. `ValidationResult` has no scan-completeness contract, and `buildInstallDecision` does not evaluate coverage.

Concrete case: a helper fetch fails while the manifest succeeds. The remaining content can receive a clean scan even though the helper was never inspected. An import warning is not equivalent to persistent evidence in exports and verdicts.

Smallest complete change: record discovered, inspected, excluded, unreadable, oversized, and unsupported paths with reasons; add a compact completeness field to the saved result. Incomplete content analysis should require manual review. Expose it in JSON, SARIF, reports, badges, cache identity, and CI exit gates. Keep policy exclusions distinguishable from failures.

Reach: importer, upload/input contract, result types and normalization, persistence/cache, trust/report readers, CLI/Action, exports, tests. Handle old stored reports as unknown coverage.

### 3. Give the CLI and Action the same security engine

Evidence: `packages/cli/src/index.ts:27` has ten hardcoded dangerous patterns. `.github/actions/validate-skill/index.js` has its own compact scanner. The web scanner invokes additional patterns, secrets, obfuscation, MCP, permissions, and capability drift. `packages/core` already exists but does not make these entry points equivalent today.

Concrete case: a threat recognized by a web-only rule can pass a local/CI scan. These are different guarantees under the same product name.

Smallest complete change: use one shared security entry point from the existing core package. First align security findings, rule IDs, coverage, and exit policy; the complete web UI and database workflow need not run in CI. Publish the CLI after parity and bounded ingestion are verified. Add one fixture scanned through all three entry points.

Reach: web security/core exports, CLI, Action, rule versions, output mapping, documentation, integration fixtures. Review CLI/Action recursion and resource limits as part of consolidation.

## Add next, in this order

1. **OSV vulnerability checks.** Start with exact versions from npm lockfiles and pinned Python requirements. Batch/cache requests and report advisories with affected/fixed versions. A version range must not be treated as an installed version. Lookup failure means unavailable evidence, not a clean dependency bill. Outbound queries disclose dependency names and versions, not source contents.
2. **Optional deeper analysis.** Evaluate pinned SkillSpector in an isolated worker using static mode first. Map its rule IDs, locations, severity, provenance, and completeness into Shield while keeping its result separately inspectable. Do not combine Shield's higher-is-better overall score with NVIDIA's higher-is-worse risk score. Do not execute scanned skills. The Python/YARA/runtime footprint favors a separate worker over embedding it into a Next.js request.
3. **Reusable accepted-finding baselines.** Reuse current evidence hashing and review decisions, but build a cross-scan fingerprint: the existing `findingKey` includes `scanId` and cannot itself serve as a reusable baseline. Bind approvals to source and scanner version, retain suppressed evidence, require a reason, and invalidate on relevant changes.
4. **An MCP install-check tool.** A small agent-callable `scan_skill` tool should reuse the shared engine and return verdict, evidence, completeness, and source identity. Never accept server filesystem paths from arbitrary remote clients. Start with local stdio or a constrained URL/upload interface.
5. **Content-based AI discovery.** Send bounded, redacted source chunks to an opt-in reviewer, including scans with no static findings. Validate new findings against actual file/line evidence. Preserve deterministic findings; record provider failure and reviewed scope. Keep the existing human approval model for changing effective findings.
6. **Later:** nested-container/binary inventory, safely bounded transitive scans, registry-specific MCP drift, and multilingual security fixtures. If SkillSpector is adopted, reuse its supported capabilities before creating duplicate implementations.

## Validate before claiming superiority

Use a small labeled corpus: benign skills, real/representative malicious helpers, alias/reflection cases, encoded payloads, secrets sent over a network, known vulnerable dependencies, malicious MCP descriptions, unavailable files, and multi-skill packages. Run both tools against the same immutable contents, first static-only and then with comparable AI settings. Compare missed threats, false alarms, coverage, scan time, and cost. Existing unit-test success does not establish comparative detection accuracy.

## Do not prioritize

- More dashboards, a new scoring UI, or more AI providers before scan completeness.
- Rebuilding the whole product in Python or copying LangGraph orchestration.
- Advertising AST parsing before implementing it: `lib/events/scan-stream.ts:181` currently emits that wording without a code-parser pass at that step.
- A runtime sandbox as a response to this comparison. Neither product's standard scanner executes the scanned skill. Shield's VM helper is not wired into the standard scan and is not evidence of secure operating-system isolation.
- Claims based on the README's pattern count. The inspected NVIDIA source includes capabilities and rules beyond that headline; only a labeled comparison can establish detection quality.

## Sources and limits

- [Pinned NVIDIA source](https://github.com/NVIDIA/skillspector/tree/8b993d32eb66c88496eb5aa5088530ac8b9214d5)
- [Resource bounds](https://github.com/NVIDIA/skillspector/blob/8b993d32eb66c88496eb5aa5088530ac8b9214d5/docs/ANALYSIS_RESOURCE_BOUNDS.md)
- [Suppression contract](https://github.com/NVIDIA/skillspector/blob/8b993d32eb66c88496eb5aa5088530ac8b9214d5/docs/SUPPRESSION.md)
- [Python data-flow analyzer](https://github.com/NVIDIA/skillspector/blob/8b993d32eb66c88496eb5aa5088530ac8b9214d5/src/skillspector/nodes/analyzers/behavioral_taint_tracking.py)
- [Live vulnerability analyzer](https://github.com/NVIDIA/skillspector/blob/8b993d32eb66c88496eb5aa5088530ac8b9214d5/src/skillspector/nodes/analyzers/static_patterns_supply_chain.py)
- [Agent-callable scanner](https://github.com/NVIDIA/skillspector/blob/8b993d32eb66c88496eb5aa5088530ac8b9214d5/src/skillspector/mcp_server.py)

Not checked: NVIDIA scanner execution, live AI/OSV calls, deployment behavior, comparative accuracy, full test suite, every module, or a complete security assessment. This audit changes no application behavior. The main current risk is that omitted supporting content can leave users with more confidence than the actual scan scope supports.
