# API Reference

SkillShield exposes JSON APIs under `/api`. The application does not provide built-in authentication, so production deployments should place sensitive endpoints behind an appropriate access-control layer.

## `POST /api/validate`

Validate a set of skill files and store the resulting report.

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

The endpoint accepts up to 30 files, 3 MB per file, and 15 MB for the complete request.

### Response

Returns a stored `ValidationResult` containing:

- `id` and `timestamp`
- `skillName`
- `overallScore` and `riskLevel`
- `summary`, `axes`, and `findings`
- `compatibility` and `tokenAnalysis`
- `skillPreview`
- optional `source` metadata

If the overall score is below `70`, the server attempts to create a pending approval record. Failure to create that record does not fail the validation request.

## `GET /api/validate`

Retrieve a stored validation result.

| Parameter | Required | Description |
| --- | --- | --- |
| `id` | Yes | Validation result ID. |

## `POST /api/github`

Import a skill from GitHub and audit repository-level installation and execution surfaces before validation.

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

`branch`, `sha`, extension filters, and ignore paths are optional. When a repository root contains multiple skills and no path is supplied, the endpoint returns `requiresSkillSelection: true` with the discovered skill paths.

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

`repositoryAudit` covers install and execution surfaces. `repositoryMeta` provides repository trust signals for the report UI. Configure `GITHUB_TOKEN` to improve API limits and scan private repositories accessible to that token.

## `GET /api/report`

Export a stored scan report.

| Parameter | Required | Default | Description |
| --- | --- | --- | --- |
| `id` | Yes | — | Validation result ID. |
| `format` | No | `json` | One of `json`, `html`, `pdf`, or `sarif`. |

The `pdf` format returns print-friendly HTML for the browser's save-to-PDF workflow; it does not return a binary PDF.

## `POST /api/ai-review`

Run provider-backed analysis on an existing set of findings.

```json
{
  "findings": [
    {
      "id": "finding-1",
      "severity": "high",
      "category": "command-injection",
      "title": "Pipe to shell",
      "message": "A downloaded script is executed directly."
    }
  ],
  "skillName": "my-skill",
  "provider": "openai"
}
```

Supported request providers are `openai` and `anthropic`. Configure the matching `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` environment variable. Finding snippets are redacted for common secret formats before they are sent to the provider.

## Approvals

### `GET /api/approvals`

List approval records or retrieve the record for one scan.

| Parameter | Required | Description |
| --- | --- | --- |
| `scanId` | No | Return the approval associated with one scan. |
| `status` | No | Filter by `pending`, `approved`, or `rejected`. |
| `limit` | No | Limit the number of returned records. |

### `POST /api/approvals`

Approve or reject a scan.

```json
{
  "scanId": "scan_123",
  "action": "approve",
  "reviewer": "admin",
  "notes": "Reviewed the install surfaces and findings."
}
```

## Audit logs

### `GET /api/audit`

| Parameter | Required | Description |
| --- | --- | --- |
| `event` | No | Filter by event name. |
| `limit` | No | Limit the number of returned records. |

## Webhooks

- `GET /api/webhooks` lists registered webhooks.
- `POST /api/webhooks` registers a webhook.
- `DELETE /api/webhooks` deletes a webhook by `id`.

Example registration request:

```json
{
  "url": "https://hooks.example.com/skillshield",
  "events": ["scan.completed"],
  "secret": "whs_xxx"
}
```

## Policy evaluation

### `POST /api/policy`

Evaluate existing findings and a score against a supplied policy object.

```json
{
  "score": 82,
  "findings": [],
  "policy": {
    "mode": "default",
    "failOn": "high",
    "blockSecrets": true,
    "blockDestructiveCommands": true,
    "requirePermissionManifest": false,
    "allowExternalDomains": [],
    "blockedCommands": [],
    "maxFileSizeMB": 10,
    "maxFiles": 100
  }
}
```

## Additional endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/compare` | Compare two stored scan results. |
| `POST` | `/api/events` | Receive supported application events. |
| `GET` | `/api/rules` | Return scanner rule metadata. |
| `GET` | `/api/semgrep-rules` | Return built-in Semgrep-compatible rules. |
| `GET` | `/api/health` | Return service health and storage statistics. |
| `GET` | `/api/docs` | Return the generated OpenAPI-style document. |
| `GET` | `/api/badge/github/{owner}/{repo}/{path?}` | Return the latest public GitHub trust badge. |
