# Optional deep scanning and source discovery

Both operations run only when explicitly requested from a saved report. Neither changes the stored validation score or deterministic findings. POST `/api/deep-scan` with `{ "scanId": "...", "transitive": false }`; POST `/api/ai-discovery` with `{ "scanId": "...", "consent": true }`. Arbitrary server paths, executable flags and caller supplied source content are rejected.

Saved multi-skill reports use the engine's recursive mode. Child findings retain their skill directory prefixes, aggregate risk stays separate, and omitted or failed child scans make the aggregate partial.

Deep scanning uses NVIDIA SkillSpector commit `8b993d32eb66c88496eb5aa5088530ac8b9214d5`, version `2.12.0`. This checkout has a local runtime at `.tools/skillspector` and its three pin settings in `.env.local`. Restart the local server to load those settings. Other hosts must install their own runtime into a dedicated trusted environment, preferably an isolated worker with resource limits and restricted egress:

```powershell
py -m venv .skillspector-worker
.\.skillspector-worker\Scripts\python.exe -m pip install "git+https://github.com/NVIDIA/skillspector.git@8b993d32eb66c88496eb5aa5088530ac8b9214d5"
$env:SKILLSPECTOR_BIN = (Resolve-Path .\.skillspector-worker\Scripts\skillspector.exe).Path
$env:SKILLSPECTOR_COMMIT = '8b993d32eb66c88496eb5aa5088530ac8b9214d5'
$env:SKILLSPECTOR_BIN_SHA256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $env:SKILLSPECTOR_BIN).Hash.ToLowerInvariant()
```

The adapter checks the actual executable hash and CLI version before each scan. The commit setting is an operator attestation of the pinned installation: the launcher hash alone does not attest Python modules. Keep the environment read-only to application users. Installing the git commit pins engine source, not all third party dependency artifacts; lock the worker deployment separately.

It runs the trusted executable directly without a shell, uses `--no-llm`, does not apply shipped baselines, limits stdout/stderr to 2 MB, times out the version check at 15 seconds and scanning at 90 seconds, and removes its temporary directory. Risk-threshold exit code 1 preserves the engine report; timeout and output-limit failures do not. There are at most two active scans per Node worker, and routes request three calls per client per minute through existing rate-limit infrastructure. Multi-worker deployments need a shared worker queue for a global concurrency ceiling. Scanned application code is never executed. `--no-llm` may still perform engine advisory network requests; enforce worker egress policy externally.

GitHub reports with a valid full commit SHA are scanned using a fixed-host immutable GitHub tree URL so original archives/binary artifacts can be inspected by the engine. Other reports use retained text files (maximum 200 files, 2 MB combined), safe relative paths and no case-colliding names. Text-only inspection always reports partial coverage because original binary/archive bytes are unavailable.

Linked-source scanning is disabled by default. Configure comma-separated `SKILLSPECTOR_TRANSITIVE_PREFIXES` containing explicit GitHub repository prefixes, for example `https://github.com/NVIDIA/skillspector/`, then request `transitive:true`. Prefixes cannot be provided by callers. Depth defaults to 1 and is limited to 2. The engine's own ingestion and traversal ceilings additionally apply; the same 90-second execution bound covers traversal. Requested traversal without configured prefixes returns unavailable. Registry comparison is not exposed by this adapter.

Deep result fields: `engine`, `engineRevision`, `status` (`complete`, `partial`, `unavailable`), `reason`, `scoreDirection: "higher-is-worse"`, `riskScore`, `findings`, original bounded `issues` including locations/evidence, `completeness`, `sourceMode`, `engineReport` (bounded redacted raw JSON), `scanId`, `source`, `sourceFiles` (stored text paths, byte counts and SHA-256 hashes), and preserved `deterministicFindings`. Risk score is separate from Shield's higher-is-better score. Missing completeness, malformed locations or engine failures never yield a clean verdict.

AI discovery sends bounded, secret-redacted source chunks to a configured remote provider, even when deterministic findings are empty. Existing provider environment variables are reused. Local OpenCode is disabled because the existing integration cannot enforce a deny-all tools policy. Embedded source instructions are explicitly treated as untrusted data; providers are called only via the existing text completion API. Structured findings must identify the exact supplied path and a valid supplied line range. Invalid/missing responses and skipped source become partial/unavailable. Findings are advisory, never suppress deterministic results, and are not proof of safety. Redaction is best effort; consent is required because source is sent to the provider.

Discovery fields: `status`, `reason`, `findings`, `filesReviewed`, `totalFiles`, `chunksReviewed`, `totalChunks`; routes additionally return `scanId`, `source`, `sourceFiles`, `provider`, and `deterministicFindings`. Input is limited to 200 unique paths and 2 million characters. At most four chunks of 12,000 characters are sent; overlong single lines and excess content are skipped and explicitly cause partial status. `totalChunks` counts selected chunks, not omitted content. Existing provider calls time out after 60 seconds each. Inspect coverage fields and status before interpreting results. No source is re-fetched for AI discovery.
