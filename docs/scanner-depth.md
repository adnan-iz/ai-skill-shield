# Scanner depth additions

The existing report now shows inspected-file coverage and skipped paths. A high score cannot produce a trusted Explorer label or a clean review verdict when coverage is missing, partial, or a requested dependency check failed. Original scan scores and approved-review evidence remain immutable.

GitHub batch imports inspect manifests and supporting files, with at most 300 extra selected support files per repository, 10 MiB retained content, eight concurrent file fetches and a 60-second fetch-phase budget. Unsupported, excluded or unfetched content remains visible as partial coverage. Manifest omissions fail the batch rather than silently reporting a complete collection. Large repositories may need separate skill-path scans.

The shared security engine powers the CLI and GitHub Action. Build with `npm run build:local-tools`. [CLI documentation](cli.md) covers source-bound accepted baselines, explicit install verdicts, strict exit policies and the local MCP scan tool. [Dependency checks](dependency-advisories.md) cover OSV requests and supported exact-version formats.

On a saved report, **Run deep security scan** uses pinned NVIDIA SkillSpector for Python code parsing/data-flow analysis, YARA signatures, original bundled artifacts and optional bounded linked-source scanning. **Find new threats with AI** examines redacted source after consent, including scans with no static findings. Download each check's separate evidence; the original report remains unchanged. [Setup and limits](deep-scan.md).

## MCP registry snapshots

POST `/api/compare` with this body:

```json
{
  "mode": "mcp-registry",
  "before": { "servers": [{ "server": { "name": "acme/tool", "version": "1.0.0", "remotes": [{ "type": "sse", "url": "https://old.example" }] } }] },
  "after": { "servers": [{ "server": { "name": "acme/tool", "version": "1.0.0", "remotes": [{ "type": "sse", "url": "https://new.example" }] } }] }
}
```

The response lists `added`, `removed`, `changed`, `unmodeledChanges`, and `unchangedCount`. Identity is name plus version: a new version is an addition, not an in-place change. Use snapshots covering the same selection scope; absence only proves a record is absent from that supplied snapshot. No listed endpoint is contacted or executed. Object-key and normalized package/remote ordering do not create field changes; other raw changes remain inspectable as unmodeled changes. Inputs are bounded to 5,000 records per snapshot, 64 structural levels and 100,000 canonicalization nodes per snapshot.

## Multilingual rules

Regression fixtures cover a small set of direct Chinese, Japanese and Korean instruction overrides and benign warning contexts. This is limited phrase coverage, not a claim of complete multilingual detection. The optional content reviewer provides a separate semantic check.

## Deployment

The database bootstrap adds a nullable `scan_complete` metadata column. Historical rows remain unknown and require rescan before being marked trusted. This checkout's ignored `.tools/skillspector` runtime and local pin settings do not transfer to another host; install the pinned worker there and rebuild the CLI/Action bundles when security rules change. Linked-source scanning requires an explicit server repository-prefix allowlist. No packages have been published and no deployment was performed.
