# Policy Engine

SkillShield supports policy evaluation for scan findings and scores. The current app exposes policy behavior through the API and the `/rules` UI playground.

## Modes

| Mode | Intent |
|---|---|
| `default` | balanced baseline |
| `strict` | tighter blocking |
| `enterprise` | lower tolerance and stronger review expectations |
| `custom` | caller-supplied configuration |

## Example policy

```yaml
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

## Current use

Policies are useful for:

- CI gating
- local review standards
- organization-specific tolerances

## Current limit

The app does not yet have a fully organization-scoped multi-tenant policy management layer. Today the policy engine is best treated as a scan-time evaluation tool rather than a centralized enterprise policy platform.
