# CLI Reference

The repository includes a CLI package in `packages/cli/`.

## Run directly

```bash
npx skillshield-cli scan ./path/to/skill
```

## Install globally

```bash
npm install -g skillshield-cli
skillshield scan ./path/to/skill
```

## Command

### `scan`

```bash
skillshield scan <path> [options]
```

### Options

| Option | Default | Description |
|---|---|---|
| `--format` | `json` | `json`, `html`, `sarif`, `markdown` |
| `--fail-on` | `high` | fail threshold: `critical`, `high`, `medium`, `low` |
| `--output` | stdout | write report to a file |
| `--policy` | - | path to a policy file |

## Example

```bash
skillshield scan ./my-skill --format sarif --output result.sarif
```

## Scope note

The CLI validates local skill content. Repository trust metadata and GitHub repository install-surface auditing are first-class in the web app's GitHub import flow.
