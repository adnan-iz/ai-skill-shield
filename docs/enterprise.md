# Enterprise Deployment Notes

SkillShield includes several controls that support internal security review, but it remains a local-first application rather than a complete multi-tenant enterprise platform.

## Available capabilities

### Approval workflow

- Scans below the score threshold can create pending approval records automatically.
- Report reviewers can approve or reject a scan.
- Approval status is included in the report's installation checklist.

### Audit logs and webhooks

- Audit events are stored in the configured database.
- Webhooks can be registered for supported scan events.
- Validation and report operations continue if webhook delivery fails.

### Repository installation review

GitHub imports inspect repository-level execution surfaces, including:

- Package lifecycle scripts
- Installation and bootstrap scripts
- Custom package registries
- GitHub Actions workflows
- Git submodules
- Related service and container configuration

This review supports software supply-chain assessment before a skill is installed in an agent environment.

## Current limitations

SkillShield does not currently provide:

- Built-in authentication, SSO, or SAML
- Role-based access control
- Team workspaces or tenant isolation
- Helm deployment assets
- Billing or subscription management

Deployments that require these controls should provide them through an identity-aware proxy, private network, or hosting-platform access layer.

## Recommended internal deployment

1. Run SkillShield in a controlled internal environment.
2. Configure durable remote storage for shared reports and approvals.
3. Set `GITHUB_TOKEN` for more reliable repository scanning.
4. Protect the application with your organization's access-control layer.
5. Forward relevant audit events to an internal webhook receiver.
6. Treat SkillShield as a pre-install review aid, not as a replacement for runtime isolation or endpoint security.

## Recommended next steps

- Durable retention controls and administration
- Reviewer queues, attribution, and notes
- Authentication and authorization
- Organization-level policy management
