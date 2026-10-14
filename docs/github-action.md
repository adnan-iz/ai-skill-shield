# GitHub Action

The Action at `.github/actions/validate-skill` uses the same security engine as the CLI and web scanner. Its committed bundle runs standalone with Node 20; consumers do not install repository dependencies. Rebuild the bundle after scanner changes using `node scripts/build-local-tools.mjs` from the repository root.

```yaml
name: Skill security
on: [pull_request, push]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/validate-skill
        with:
          skill-path: ./skills/my-skill
          fail-on: high
          fail-on-incomplete: 'true'
```

| Input | Default | Behavior |
| --- | --- | --- |
| `skill-path` | required | Directory containing root `SKILL.md`. |
| `fail-on` | `high` | Fail for active findings at or above critical/high/medium/low/info. |
| `fail-on-incomplete` | `true` | Fail for partial local coverage or unavailable requested advisory checks. |
| `output-format` | `json` | json, html, markdown or sarif. |
| `baseline` | none | Reviewed baseline path relative to the workspace. |
| `dependencies` | `false` | Opt in to OSV queries for exact dependency versions. |

| Output | Meaning |
| --- | --- |
| `score` | Shared security score, 0–100. |
| `risk-level` | Highest original finding severity, or safe. |
| `finding-count` | Number of actual findings, including accepted findings. |
| `active-finding-count` | Number of findings not accepted by matching baseline. |
| `coverage` | complete or partial. |
| `verdict` | Do Not Install, Needs Manual Review or Safe to Review from active findings and check completeness. |

The Action emits escaped workflow annotations for active findings. JSON, Markdown and SARIF are written to the log; HTML is written to `skillshield-report.html` under `RUNNER_TEMP` (or the skill directory outside Actions). Upload reports separately if required.

Local exclusions and baselines follow the [CLI contract](cli.md). A changed source or incompatible engine cannot silently inherit accepted findings. Coverage is partial for excluded dependency/generated directories, unreadable/binary/oversized files, symlinks and traversal limits. This is the shared security scan, not the web validator's entire multi-axis or repository review. It never executes scanned code.
