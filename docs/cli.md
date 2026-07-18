# CLI Reference

The repository contains the `skillshield-cli` package in `packages/cli/`. Its executable is named `skillshield`.

## Run with `npx`

```bash
npx skillshield-cli scan ./path/to/skill
```

## Install globally

```bash
npm install --global skillshield-cli
skillshield scan ./path/to/skill
```

## Build from source

```bash
npm install --prefix packages/cli
npm run build --prefix packages/cli
node packages/cli/dist/index.js scan ./path/to/skill
```

## `scan` command

```bash
skillshield scan <path> [options]
```

| Option | Default | Description |
| --- | --- | --- |
| `--format <format>` | `json` | Output format: `json`, `html`, `sarif`, or `markdown`. |
| `--fail-on <severity>` | `high` | Exit with status `1` when the result meets or exceeds `critical`, `high`, `medium`, or `low`. |
| `--output <file>` | Standard output | Write the report to a file. |
| `--policy <path>` | — | Reserved option; the current CLI does not apply the supplied policy file. |

### Example

```bash
skillshield scan ./my-skill --format sarif --output result.sarif
```

## Current scope

The CLI provides a compact local scanner for frontmatter and common dangerous patterns. It does not run the web application's complete 11-axis validator, GitHub repository metadata review, or repository install-surface audit.
