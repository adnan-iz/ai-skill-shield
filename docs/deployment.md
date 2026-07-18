# Deployment Guide

## Requirements

- Node.js 20+
- npm
- SQLite by default
- optional GitHub token for private repository scans

## Local production-style run

```bash
npm install
npm run build
npm start
```

Open `http://localhost:3000`.

## Docker

```bash
docker compose up -d
```

The included compose setup runs the standalone Next.js server on port `3000` and persists SQLite data in the `skillshield_data` volume.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Recommended | Public base URL for metadata, sitemap, and shared links |
| `GITHUB_TOKEN` | Recommended | Avoids shared-IP GitHub API limits and enables accessible private repos |
| `OPENAI_API_KEY` | No | Enables OpenAI-backed AI review |
| `ANTHROPIC_API_KEY` | No | Enables Anthropic-backed AI review |
| `DATABASE_URL` | No | SQLite/libSQL URL; defaults to `file:./data/skillshield.db` |
| `DATABASE_AUTH_TOKEN` | For remote libSQL | Authentication token for the remote database |

## Storage

By default the app uses SQLite under `data/skillshield.db`. Docker stores the same database at `/app/data/skillshield.db` in a named volume.

On startup the app creates required tables automatically, which makes first-run environments much smoother than earlier versions.

On Vercel, configure a remote libSQL database with `DATABASE_URL` and `DATABASE_AUTH_TOKEN` (the `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` aliases also work). Without one, SkillShield uses ephemeral `/tmp` storage: scans work, but server-side reports, approvals, and public trust pages are not durable across function instances.

## Operational notes

- browser-local history is convenience storage, not the durable source of truth
- durable report lookup comes from server storage by result ID
- PDF export is browser-print HTML rather than server-rendered binary PDF
- GitHub repo auditing is strongest when `GITHUB_TOKEN` is configured

## Health checks

Use:

```bash
curl http://localhost:3000/api/health
```

to verify the app responds and storage is reachable.
