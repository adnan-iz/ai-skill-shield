# API Reference

Base URL: `/api`

## POST /api/validate

Run full validation on provided files.

### Request

```json
{
  "files": [
    {
      "path": "SKILL.md",
      "content": "---\nname: my-skill\n---\n\n# Instructions"
    }
  ],
  "source": {
    "type": "paste"
  }
}
```

### Response

Returns a `ValidationResult` with:

- `id`
- `overallScore`
- `riskLevel`
- `summary`
- `axes`
- `findings`
- `compatibility`
- `skillPreview`
- optional `source`

If the result scores below the approval threshold, the server attempts to create a pending approval record automatically.

## GET /api/validate

Fetch a previously stored result.

### Query

| Param | Required | Description |
|---|---|---|
| `id` | Yes | Validation result ID |

## POST /api/github

Import files from GitHub and audit repository install surfaces before validation.

### Request

```json
{
  "owner": "user",
  "repo": "my-skills",
  "path": "skills/my-skill",
  "branch": "main",
  "sha": "abc123def456",
  "includeExtensions": [".md", ".yaml"],
  "ignorePaths": ["node_modules", ".git"]
}
```

### Response

```json
{
  "files": [{ "path": "SKILL.md", "content": "..." }],
  "owner": "user",
  "repo": "my-skills",
  "branch": "main",
  "path": "skills/my-skill",
  "truncated": false,
  "repositoryMeta": {
    "fullName": "user/my-skills",
    "stars": 12,
    "forks": 1,
    "openIssues": 0,
    "archived": false,
    "license": "MIT"
  },
  "repositoryAudit": {
    "riskLevel": "medium",
    "summary": {
      "totalFiles": 14,
      "workflowCount": 1,
      "installScriptCount": 1,
      "installSurfaceCount": 3,
      "truncated": false
    },
    "surfaces": [],
    "findings": []
  }
}
```

### Notes

- `repositoryAudit` focuses on install and execution surfaces
- `repositoryMeta` adds repo trust signals for the report UI
- if `GITHUB_TOKEN` is configured, private repositories accessible to that token can also be scanned

## GET /api/report

Export a scan report.

### Query

| Param | Required | Default | Description |
|---|---|---|---|
| `id` | Yes | - | Scan result ID |
| `format` | No | `json` | `json`, `html`, `pdf`, `sarif` |

### Notes

- `format=pdf` currently returns print-friendly HTML for browser save-to-PDF workflows

## POST /api/ai-review

Run AI-powered analysis over existing findings.

### Request

```json
{
  "findings": [],
  "skillName": "my-skill"
}
```

## GET /api/approvals

List approvals or fetch the approval record for a scan.

### Query

| Param | Required | Description |
|---|---|---|
| `scanId` | No | Fetch approval for a single scan |
| `status` | No | Filter by `pending`, `approved`, or `rejected` |
| `limit` | No | Limit returned records |

## POST /api/approvals

Approve or reject a scan.

### Request

```json
{
  "scanId": "scan_123",
  "action": "approve",
  "reviewer": "admin",
  "notes": "Looks safe"
}
```

## GET /api/audit

Query audit log events.

### Query

| Param | Required | Description |
|---|---|---|
| `event` | No | Filter by event name |
| `limit` | No | Maximum rows to return |

## GET /api/webhooks

List registered webhooks.

## POST /api/webhooks

Register a webhook.

### Request

```json
{
  "url": "https://hooks.example.com/skillshield",
  "events": ["scan.completed"],
  "secret": "whs_xxx"
}
```

## DELETE /api/webhooks

Delete a webhook by `id`.

## GET /api/health

Return service health and lightweight storage statistics.

## GET /api/docs

Return the generated OpenAPI-style API document for the app.
