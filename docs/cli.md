# CLI Reference

The repository contains an experimental CLI package in `packages/cli/`. It is not published to npm yet.

For the complete scanner without installing anything, use the [live web app](https://ai-skill-shield.suppeng.com/).

## Run from source

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
| `--policy <path>` | - | Reserved option; the current CLI does not apply the supplied policy file. |

### Example

```bash
node packages/cli/dist/index.js scan ./my-skill --format sarif --output result.sarif
```

## Current scope

The CLI provides a compact local scanner for frontmatter and common dangerous patterns. It does not run the web application's complete 11-axis validator, GitHub repository metadata review, or repository install-surface audit.
