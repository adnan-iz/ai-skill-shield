# GitHub Action

The repo includes a local action at `.github/actions/validate-skill`.

## Example workflow

```yaml
name: SkillShield Scan

on:
  pull_request:
  push:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Scan skills
        uses: ./.github/actions/validate-skill
        with:
          skill-path: ./skills/my-skill
          fail-on: high
```

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `skill-path` | Yes | - | path to the skill directory |
| `fail-on` | No | `high` | failure threshold |
| `output-format` | No | `json` | `json` or `html` |

## Outputs

| Output | Description |
|---|---|
| `score` | overall score |
| `risk-level` | risk label |
| `finding-count` | total findings |

## Notes

- the action is best for CI validation of skill files already present in the repo
- the richer GitHub repository audit flow lives in the web app's `POST /api/github` path
