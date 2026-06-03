# Enterprise Notes

SkillShield has a useful set of enterprise-oriented building blocks today, but it is still best described as a local-first security review app rather than a full enterprise platform.

## Available now

### Approval workflow

- scans below threshold can create pending approvals automatically
- reports support approve and reject actions
- approval state is included in the install decision flow

### Audit and webhook plumbing

- audit logs are stored server-side
- webhooks can be registered for scan events
- report and validation actions are designed to tolerate webhook failures

### Repository install-surface review

For GitHub imports, the app audits:

- lifecycle scripts
- install scripts
- custom registries
- workflows
- submodules
- related execution surfaces

This is currently the strongest enterprise-facing capability because it directly supports software supply chain review before agent installation.

## Important limits

These are not shipped as full product features yet:

- SSO
- SAML
- RBAC
- team workspaces
- multi-user tenant isolation
- Helm deployment assets
- billing tiers

Older docs overstated some of these; the current codebase does not support them as complete features.

## Practical enterprise setup

If a team wants to use the current app seriously, the best path today is:

1. run it in a controlled internal environment
2. configure `GITHUB_TOKEN` for richer repository scanning
3. use shared report IDs plus approval records as the review trail
4. push audit events to your own webhook target
5. treat the app as a pre-install review gate, not as a full IAM platform

## Recommended next enterprise steps

- stronger durable report retention
- reviewer notes and queue UX
- auth and access control
- organization-level policy presets
