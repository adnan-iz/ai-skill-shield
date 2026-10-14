# CLI and local agent tool

Build from the repository root using the installed root dependencies:

```powershell
npm ci
node scripts/build-local-tools.mjs
node packages/cli/dist/index.js scan "F:\skills\my-skill" --fail-on high --fail-on-incomplete
```

The bundled CLI uses the web application's security engine, including secrets, obfuscation, MCP schemas and capability drift. It scans supporting files without executing them. It does not run the web validator's other axes, repository metadata review, remote discovery or optional deep worker. The package is not published.

| Option | Default | Behavior |
| --- | --- | --- |
| `--format json\|html\|sarif\|markdown` | `json` | Report format. |
| `--output <file>` | stdout | Write report to a file. |
| `--fail-on critical\|high\|medium\|low\|info` | `high` | Exit 1 for active findings at or above the threshold. |
| `--fail-on-incomplete` | off | Exit 1 if local coverage is partial or requested advisory lookup is unavailable. |
| `--dependencies` | off | Query OSV for supported exact package versions; sends package names and versions to OSV. |
| `--baseline <file>` | none | Apply reviewed acceptances only when engine version and source hash match. |
| `--write-baseline <file> --reason <text>` | none | Save accepted current findings with a required reason. Requires complete coverage. |

All formats preserve findings; JSON includes `activeFindings` and `suppressedFindings` with original findings and acceptance reasons. The score and risk reflect original findings. Acceptance only changes the failure policy. Changes to any inspected source file invalidate prior acceptance. An incompatible baseline format or engine version is an error. Baselines must be outside the scanned directory and no larger than 1 MiB; in-scope baselines are rejected so writing one cannot invalidate its own source hash.

```powershell
node packages/cli/dist/index.js scan .\my-skill --write-baseline .\accepted.json --reason "Reviewed intentional network installer"
node packages/cli/dist/index.js scan .\my-skill --baseline .\accepted.json --format sarif --output .\report.sarif
```

Creating a baseline does not automatically bypass the current run's severity policy. Review the findings and baseline before reuse.

Every report and MCP tool result includes an explicit `verdict`: active critical findings mean **Do Not Install**; active high/medium findings, partial coverage or unavailable requested advisories mean **Needs Manual Review**; otherwise **Safe to Review**. Baseline acceptance recomputes this verdict while retaining original finding severity and score.

Coverage records paths and reasons for skipped symlinks, binaries, invalid UTF-8, unreadable files, dependency/generated directories and limits. Limits are 1 MiB per file, 16 MiB total text, 1,000 inspected files, 10,000 entries and 32 directory levels. Excluded directory descendants are not enumerated; discovered-file counts are a lower bound when coverage is partial. A readable, nonempty root `SKILL.md` is required.

## MCP stdio

Point a local MCP client at the generated executable:

```json
{
  "mcpServers": {
    "skillshield": {
      "command": "node",
      "args": ["F:\\agent skill validator\\skill-shield\\packages\\cli\\dist\\index.js", "mcp"]
    }
  }
}
```

The server supports initialize, initialized notification, ping, tools/list and tools/call using newline-delimited JSON-RPC on stdio. Its single `scan_skill` tool accepts `{ "path": "F:\\skills\\my-skill", "dependencies": false }`. Unknown arguments are rejected. Paths are local directories available to the MCP process. Grant filesystem access according to the client's trust policy. There is no HTTP listener, remote fetch of skill sources or skill-code execution. Dependency checks are opt-in.
