# Deployment Guide

## Requirements

- Node.js 20 or later
- npm
- SQLite or a libSQL-compatible database
- Optional GitHub token for private repository scans and higher GitHub API limits

## Local production run

```bash
npm ci
npm run build
npm start
```

The application listens on [http://localhost:3000](http://localhost:3000) by default.

## Docker

```bash
docker compose up --detach
```

The Compose configuration publishes the application on port `3000` and stores SQLite data in the `skillshield_data` volume.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Recommended | Public base URL used for metadata, the sitemap, and shared links. |
| `GITHUB_TOKEN` | Recommended | Improves GitHub API limits and enables scans of accessible private repositories. |
| `OPENAI_API_KEY` | No | Enables OpenAI-backed AI review. |
| `ANTHROPIC_API_KEY` | No | Enables Anthropic-backed AI review. |
| `DATABASE_URL` | No | SQLite or libSQL URL. Defaults to `file:./data/skillshield.db` outside Vercel. |
| `DATABASE_AUTH_TOKEN` | Remote libSQL only | Authentication token for a remote database. |
| `TURSO_DATABASE_URL` | No | Alias for a remote Turso/libSQL database URL. |
| `TURSO_AUTH_TOKEN` | Remote Turso only | Alias for the remote database authentication token. |

## Storage

By default, SkillShield stores data in `data/skillshield.db`. Docker uses `/app/data/skillshield.db` inside the named volume. Required tables are created when the database is first used, so initial deployment does not require a separate migration command.

On Vercel, configure a remote libSQL database with `DATABASE_URL` and `DATABASE_AUTH_TOKEN`, or use the Turso aliases. Without a remote database, SkillShield falls back to ephemeral `/tmp` storage. Scans will run, but reports, approvals, rate limits, and public trust pages will not persist reliably across function instances.

## Operational considerations

- Browser-local history is convenience storage, not the durable source of truth.
- Durable report lookup uses the configured server-side database.
- PDF export returns print-friendly HTML rather than a server-generated binary PDF.
- GitHub repository auditing is most reliable when `GITHUB_TOKEN` is configured.
- The application has no built-in authentication layer; protect production deployments at the network or platform layer.

## Health check

```bash
curl http://localhost:3000/api/health
```

A successful response confirms that the application can respond and access its configured storage.
