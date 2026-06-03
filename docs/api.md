# API Reference

Base URL: `/api`

## POST /api/validate

Run full security validation on skill files.

**Request:**
```json
{
  "files": [
    { "path": "SKILL.md", "content": "---\nname: my-skill\n---\n\n# Instructions" }
  ],
  "options": {
    "policy": "default",
    "failOn": "high"
  }
}
```

**Response:** `200`
```json
{
  "id": "scan_abc123",
  "overallScore": 85,
  "riskLevel": "low",
  "findings": [],
  "axes": [],
  "compatibility": { "agents": [], "overallCompatibility": 100 },
  "skillPreview": { "frontmatter": {}, "body": "", "fileTree": [] }
}
```

**Errors:** `429` Rate limit, `400` Invalid input

## GET /api/report

Export a scan report.

**Query Parameters:**
| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| `id` | Yes | - | Scan result ID |
| `format` | No | `json` | Output format: `json`, `html`, `pdf`, `sarif` |

**Response:** Varies by format. `application/json`, `text/html`, `application/pdf`, or `application/sarif+json`.

## POST /api/github

Import a skill from GitHub and audit the surrounding repository install surface.

**Request:**
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

**Response:** `200`
```json
{
  "files": [{ "path": "SKILL.md", "content": "..." }],
  "owner": "user",
  "repo": "my-skills",
  "branch": "main",
  "path": "skills/my-skill",
  "truncated": false,
  "repositoryAudit": {
    "riskLevel": "medium",
    "summary": {
      "totalFiles": 14,
      "workflowCount": 1,
      "installScriptCount": 1,
      "installSurfaceCount": 3
    },
    "findings": []
  }
}
```

`repositoryAudit` summarizes repo-level install and execution surfaces such as lifecycle scripts, shell installers, GitHub Actions workflows, submodules, and custom registries. If `GITHUB_TOKEN` is configured, the endpoint also works against private repositories the token can access.

## POST /api/policy

Evaluate findings against a policy.

**Request:**
```json
{
  "findings": [],
  "score": 85,
  "policy": { "failOn": "high", "blockSecrets": true }
}
```

**Response:** `200`
```json
{
  "passed": true,
  "violations": [],
  "originalScore": 85,
  "adjustedScore": 85,
  "overridesApplied": 0
}
```

## POST /api/ai-review

Run AI-powered review of findings.

**Request:**
```json
{
  "findings": [],
  "skillName": "my-skill",
  "provider": "openai"
}
```

**Response:** `200`
```json
{
  "executiveSummary": "...",
  "findingExplanations": [],
  "remediationSteps": "..."
}
```

**Errors:** `501` AI not configured (missing API key)

## GET/POST /api/approvals

**GET:** List approvals. Query params: `scanId`, `status`, `limit`
**POST:** Approve or reject. Body:
```json
{ "scanId": "scan_123", "action": "approve", "reviewer": "admin", "notes": "Looks safe" }
```

## GET /api/audit

Query audit logs. Query params: `event`, `limit` (default 50, max 200)

## GET/POST/DELETE /api/webhooks

**GET:** List webhooks
**POST:** Register webhook. Body:
```json
{ "url": "https://hooks.slack.com/...", "events": ["scan.completed"], "secret": "whs_..." }
```
**DELETE:** Delete by `id` query param.

## GET /api/semgrep-rules

Get built-in Semgrep rules. Query param: `format` (`json` or `yaml`)

## GET /api/health

Health check. Returns:
```json
{ "status": "ok", "version": "0.1.0", "uptime": 3600, "database": "ok" }
```

## GET /api/docs

Returns the OpenAPI 3.0 specification for all endpoints.
