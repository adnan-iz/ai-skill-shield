# Policy Engine

SkillShield can evaluate scan findings and scores against a policy configuration. Policies are available through the policy library and `POST /api/policy`; the `/rules` page provides a client-side configuration preview.

## Modes

| Mode | Failure threshold | Purpose |
| --- | --- | --- |
| `default` | `high` | Balanced baseline. |
| `strict` | `medium` | Requires a permission manifest and blocks a broader command set. |
| `enterprise` | `low` | Applies the lowest finding tolerance and the broadest built-in command restrictions. |
| `custom` | Configured value | Uses caller-supplied settings. |

## Example YAML policy

```yaml
mode: custom
failOn: high
blockSecrets: true
blockDestructiveCommands: true
requirePermissionManifest: false
allowExternalDomains:
  - api.openai.com
blockedCommands:
  - rm -rf
  - curl | bash
maxFileSizeMB: 2
maxFiles: 200
allowedFileExtensions:
  - .md
  - .json
  - .yaml
```

## Configuration fields

| Field | Description |
| --- | --- |
| `mode` | Policy preset: `default`, `strict`, `enterprise`, or `custom`. |
| `failOn` | Minimum severity that fails evaluation. |
| `blockSecrets` | Fails findings identified as exposed secrets. |
| `blockDestructiveCommands` | Fails destructive command findings. |
| `requirePermissionManifest` | Requires a declared permission manifest. |
| `allowExternalDomains` | Permits matching external domains. |
| `blockedCommands` | Adds command strings that should be blocked. |
| `maxFileSizeMB` | Maximum allowed file size. |
| `maxFiles` | Maximum allowed file count. |
| `severityOverrides` | Overrides severity by rule ID or category. |
| `allowedFileExtensions` | Restricts accepted file extensions. |
| `blockedFindings` | Blocks findings whose titles match configured values. |

## Current integration

The policy endpoint evaluates caller-supplied findings and a score; it is not applied automatically by `POST /api/validate`. The current CLI accepts a `--policy` option but does not yet apply the referenced file. Organization-scoped policy storage and multi-tenant administration are not implemented.
