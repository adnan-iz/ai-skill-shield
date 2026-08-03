# AI Skill Shield Roadmap

## Current focus

The product direction is now centered on one question:

`Can I trust this skill before I install it into an agent environment?`

The next work is ordered around that decision flow rather than around generic validator polish.

## In progress

### 1. Install-first reporting

- richer pre-install verdicts
- install-surface evidence near the top of the report
- clearer repository trust signals

### 2. Approval-friendly review flow

- stronger reviewer notes and state transitions
- cleaner shared report review experience
- better report durability beyond local browser history

## Next up

### 3. Install command risk analyzer

Let users paste install commands such as:

- `npx ...`
- `curl ... | bash`
- `codex skill install github:user/repo`

and explain what will execute before they run it.

### 4. Team review workflow

- shared approval queues
- reviewer attribution and notes
- better audit visibility for install decisions

### 5. Repository trust expansion

- commit freshness and release signals
- richer GitHub metadata
- more direct surfacing of risky transitive install behavior

## Longer-term

- durable shareable report links with stronger retention controls
- policy presets tied to organization risk posture
- CI and GitHub Action polish around install-surface reporting
- stronger diff and comparison workflows for repeated scans

## Explicitly not done yet

Older docs mentioned several features as completed when they were not. These should still be treated as future work unless the code says otherwise:

- SSO or SAML auth
- RBAC
- team workspaces
- SSE or WebSocket live scanning
- Helm charts
- billing tiers
- runtime sandbox execution
