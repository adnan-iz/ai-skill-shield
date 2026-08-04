# GitHub Action

The repository includes a local JavaScript action at `.github/actions/validate-skill`. It scans a skill directory already present in the workflow workspace.

## Example workflow

```yaml
name: AI Skill Shield Scan

on:
  pull_request:
  push:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Scan skill
        uses: ./.github/actions/validate-skill
        with:
          skill-path: ./skills/my-skill
          fail-on: high
```

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `skill-path` | Yes | — | Path to the directory containing `SKILL.md`. |
| `fail-on` | No | `high` | Requested failure severity: `critical`, `high`, `medium`, or `low`. |
| `output-format` | No | `json` | Output format: `json` or `html`. |

## Outputs

| Output | Description |
| --- | --- |
| `score` | Overall action score from `0` to `100`. |
| `risk-level` | Highest detected risk level. |
| `finding-count` | Number of files collected by the current action implementation. |

## Behavior and limitations

- The action emits workflow annotations for detected findings.
- Critical results fail the job for every `fail-on` value. With the default `high` value, high results also fail the job. The current action accepts `medium` and `low` values but does not yet enforce those lower thresholds.
- HTML output is written to `skillshield-report.html` in the scanned directory; upload it separately if it should be retained as a workflow artifact.
- The action uses a compact local rule set. The web application's GitHub import route provides the complete repository metadata and install-surface audit.
