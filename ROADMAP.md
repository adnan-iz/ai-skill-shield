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

## Completed in v2.0.0
- MCP Tool Schema poisoning & precedence hijacking detection
- Capability Drift Analyzer (manifest vs static code reality)
- Token Economics & KV-cache prefix optimization profiler
- Install Command Risk Analyzer (pipe-to-shell, sudo, dangerous flags)
- SkillBOM (CycloneDX 1.5 JSON for AI Skills)
- Adversarial Prompt Fuzzing & Red-Teaming Harness (21 attack vectors)
- Language Server Protocol (LSP) Diagnostics & QuickFix Engine
- Runtime MCP Gateway Proxy & Interceptor (DLP, shell injection, path traversal)
- Ed25519 Cryptographic Signing, Canonical Digests & Tamper Detection
- Enterprise Multi-Role Governance & Multi-Signature Approval Chain
- Server-Sent Events (SSE) Live Scan Streaming Pipeline (`/api/validate/stream`)
- Runtime Sandbox Isolation Runner (`node:vm` restricted context)
- Skill Diff & Permission Escalation Detection Engine
- Golden Skill Registry & Enterprise Catalog API (`/api/registry`)

## Future Work
- SSO / SAML Enterprise Identity Providers (Okta, Azure AD)
- Native Helm Charts & Kubernetes Operator for sidecar injection
- Dedicated hardware-isolated microVM sandboxing (Firecracker)
