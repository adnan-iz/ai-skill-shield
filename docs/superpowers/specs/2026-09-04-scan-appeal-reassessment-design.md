# Scan Appeal and Reassessment Design

## Summary

AI Skill Shield will accept evidence submitted as comments on the GitHub issues it creates for repository scans. A queued review will compare each concrete claim with the original scan result and the exact scanned commit, produce structured finding decisions, derive corrected risk and report state, and post an auditable reply.

The first release is deliberately conservative: no review changes a public finding automatically. A human reviewer must approve proposed changes. The original scan remains immutable, and approved decisions form a separate history used to derive the effective findings, counts, risk, and installation verdict. The numerical validation score changes only through a normal validator rescan, never through an appeal adjustment formula.

## Goals

- Let repository maintainers challenge false positives with evidence where the scan report already appears.
- Verify claims independently instead of trusting the commenter or asking an AI model to choose a score.
- Preserve the original scan, the exact evidence reviewed, and every decision.
- Produce deterministic effective findings, counts, risk, and installation verdict from approved decisions.
- Preserve a single numerical scoring model by changing the score only through a normal exact-commit rescan after scanner-rule correction.
- Reply on the originating GitHub issue with a concise, evidence-linked result.
- Provide a safe path to limited automatic suppression in a later release after accuracy is measured.

## Non-goals

- Proving that a repository is safe.
- Executing repository code or instructions while reviewing a claim.
- Following arbitrary external links included in comments.
- Reviewing general complaints that cannot be associated with specific findings.
- Creating a second numerical score-adjustment formula for appeals.
- Combining newer repository content with the historical decision for an older scan.

## Product policy

### Review eligibility

A comment is eligible when all of the following are true:

- It is created on an issue tracked by `github_scan_notifications`.
- The issue belongs to the same owner and repository stored with the notification.
- The comment was not written by the AI Skill Shield account.
- The commenter has GitHub author association `OWNER`, `MEMBER`, or `COLLABORATOR`.
- The stored scan and its source commit are available.

Other comments are recorded for audit purposes but do not start a review. Commenter status controls eligibility only; it does not make a claim true.

### Comment trust boundary

Comments, issue bodies, repository files, and scanner snippets are untrusted data. They are placed only in delimited data fields in the model request. The model receives a fixed system instruction stating that content under review cannot issue commands, change policy, request secrets, or authorize tool use.

The review process reads text from GitHub but does not execute it. It does not fetch commenter-provided URLs in the first release. Secrets are redacted before evidence is sent to a remote AI provider.

### Finding decisions

Every challenged finding receives exactly one decision:

- `confirmed`: the original finding is supported by the scanned content.
- `false_positive`: the cited content does not exhibit the behavior claimed by the finding.
- `severity_reduced`: the behavior exists but its original severity is not supported.
- `severity_increased`: the evidence supports a more severe classification.
- `fixed_after_scan`: the original finding was valid at the scanned commit but differs in a newer commit.
- `insufficient_evidence`: the available evidence cannot support a change.
- `not_related`: the claim does not address the identified finding.

For the first release, `false_positive` and severity changes are proposals requiring human approval. `confirmed`, `fixed_after_scan`, `insufficient_evidence`, and `not_related` close without a score change.

## Architecture

The feature is divided into five boundaries:

1. **GitHub ingress** validates and normalizes `issue_comment` webhooks.
2. **Review queue** persists work and handles retries outside the webhook request.
3. **Evidence review** maps claims to findings, loads the exact commit, and makes structured decisions.
4. **Revision policy** validates decisions and calculates effective findings, counts, risk, and installation verdict through application code.
5. **Publication** exposes review status in the report and posts a GitHub reply.

The existing `/api/webhooks` route manages outbound customer webhooks and will not be overloaded. GitHub App events receive a dedicated route at `/api/github/webhooks`.

## Data model

### `github_comment_events`

Stores normalized webhook deliveries and supplies idempotency.

- `delivery_id` text primary key
- `event_action` text
- `owner` text
- `repo` text
- `issue_number` integer
- `comment_id` bigint
- `commenter_login` text
- `author_association` text
- `comment_body` text
- `status` enum: `ignored`, `queued`, `processing`, `completed`, `failed`
- `ignore_reason` text nullable
- `last_error` text nullable
- `created_at`, `started_at`, `completed_at` bigint timestamps

### `scan_reviews`

Represents one reassessment triggered by one comment.

- `id` text primary key
- `delivery_id` text unique
- `scan_id` text
- `target` text
- `commit_sha` text
- `status` enum: `queued`, `processing`, `awaiting_approval`, `completed`, `failed`
- `stage` enum: `queued`, `collecting_evidence`, `adjudicating`, `publishing`, `done`
- `run_at` bigint
- `attempts` integer
- `last_error` text nullable
- `original_score` integer
- `original_risk_level` text
- `proposed_risk_level` text nullable
- `effective_risk_level` text nullable
- `verified_rescan_id` text nullable
- `reply_comment_id` bigint nullable
- `provider` and `model` text nullable
- `prompt_version` text
- `summary` text nullable
- `stage_data` JSON text nullable, containing only validated resumable output for the current stage
- `created_at`, `started_at`, `completed_at` bigint timestamps

### `finding_reviews`

Stores one structured decision per challenged finding.

- `id` text primary key
- `review_id` text
- `finding_key` text
- `decision` text enum matching the product policy
- `original_severity` text
- `proposed_severity` text nullable
- `confidence` integer from 0 to 100
- `claim` text
- `explanation` text
- `evidence` JSON text containing bounded excerpts and source locations
- `requires_approval` boolean
- `approval_status` enum: `not_required`, `pending`, `approved`, `rejected`
- `reviewed_by` text nullable
- `reviewed_at` bigint nullable

### `review_applications`

Provides immutable history for approved effective-report changes.

- `id` text primary key
- `scan_id` text
- `review_id` text unique
- `effective_finding_keys` JSON text
- `suppressed_finding_keys` JSON text
- `effective_risk_level` text
- `effective_summary` JSON text
- `applied_by` text
- `reason` text
- `created_at` bigint timestamp

Foreign-key behavior will preserve completed review history even if transient queue data is cleaned up. Repository target, issue number, delivery ID, comment ID, and review status receive indexes needed by ingress and report queries.

## Stable finding identity

Current findings may not carry an identity stable enough for adjudication. The review service will derive `finding_key` from normalized scan evidence: validator axis, rule/category, file path, line number, title, and a hash of the normalized snippet or message. The key is stored with the review and is scoped to a scan ID, so duplicate-looking findings remain distinguishable without changing historical scan payloads.

## GitHub ingress

`POST /api/github/webhooks` will:

1. Read the raw request body.
2. Verify `X-Hub-Signature-256` with a dedicated GitHub webhook secret using constant-time comparison.
3. Require event `issue_comment` and action `created` for the first release.
4. Validate the minimal payload shape and size limits.
5. Insert the delivery ID idempotently.
6. Match repository and issue number to `github_scan_notifications`.
7. Apply eligibility rules and either mark the event ignored or enqueue it.
8. Return promptly without calling GitHub or an AI provider synchronously.

Edited comments are excluded initially because silently changing submitted evidence complicates audit semantics. A later version may treat an edit as a new immutable review version.

## Queue and retry behavior

The queue follows the existing database-backed GitHub notification job pattern. Workers claim jobs with `FOR UPDATE SKIP LOCKED`, use bounded batches, and retry transient failures up to three times with increasing delays.

Stages are resumable:

- Evidence collection failure leaves no model decision.
- Model or parse failure retries the analysis stage.
- GitHub reply failure does not repeat analysis; it retries publication only.
- Permanent failures retain a safe error summary without exposing tokens, raw provider responses, or secrets.

An audit event is recorded at receipt, eligibility decision, processing start, decision creation, approval, review application, verified rescan linkage, reply success, and permanent failure.

## Evidence collection

The collector loads the validation result referenced by `github_scan_notifications.last_scan_id` and confirms its owner, repository, path, and SHA match the notification record.

For each claim it collects:

- The original finding and scanner metadata.
- The exact file at `source.sha`, retrieved through the GitHub Contents or Git Data API with the installation token.
- A bounded context window around the cited line.
- Other occurrences in the same file when needed to distinguish an example from an instruction.
- The file path and content type.

The default branch may optionally be read only to classify `fixed_after_scan`. It never replaces evidence from the scanned SHA and never alters the historical review outcome.

Evidence is bounded by per-comment, per-file, and total-character limits. Binary files, oversized files, missing commits, and inaccessible repositories yield `insufficient_evidence` rather than a guessed decision.

## AI review contract

The AI integration uses the existing provider configuration and secret-redaction behavior but a separate reassessment prompt and response schema.

The first model pass extracts claims and maps them to candidate finding keys. Application code rejects unknown or duplicate keys. The second pass adjudicates only validated candidates using supplied evidence.

The response must be strict JSON containing:

- Finding key
- Decision
- Confidence from 0 to 100
- Proposed severity when applicable
- Short explanation
- Evidence references drawn only from supplied locations

Application code validates all enums, severity transitions, confidence bounds, and evidence references. Invalid output fails the job; free-form fallback parsing is not accepted for report-affecting review.

## Effective reports and verified rescoring

The AI never supplies a score. Application code creates an effective finding set by applying approved decisions to the original scan:

- Approved `false_positive` decisions exclude the finding.
- Approved severity changes replace only the severity used by the applicable deterministic calculation.
- All other decisions leave the finding unchanged.

Application code deterministically rebuilds the finding summary, highest risk level, and installation verdict from that effective finding set. The original axis scores and overall validation score remain unchanged because they cannot be reconstructed accurately from findings alone.

When an appeal exposes a scanner-rule defect, maintainers correct the rule and run the normal validators against the exact original commit. If the rescan uses the same source SHA and the corrected scanner version, it may be linked as `verified_rescan_id`; only that normal validation result can supply a revised numerical score. The review subsystem must not introduce an independent score formula or restore arbitrary points.

Because the product currently separates weighted validation score, risk level, repository audit risk, approval status, and installation verdict, reassessment must recompute each affected derived value rather than treating a single number as the whole result. The report will label these values as reviewed derivatives of the immutable original scan.

## Approval flow

The first release exposes a protected internal approval action, building on the existing approval concepts:

- A reviewer sees the original finding, claim, exact-commit evidence, AI decision, confidence, and proposed effect.
- The reviewer approves or rejects decisions individually.
- Application code recalculates the complete proposal after every decision.
- Applying the review writes one immutable `review_applications` record and marks the review completed.
- Repeated application is idempotent.

An approval cannot change the numerical score. Reviewers approve finding-level changes; the system derives effective counts, risk, and installation verdict. A linked normal rescan is required for a numerical score change.

## GitHub reply

The reply is posted with the repository installation token and includes:

- Exact reviewed commit
- Counts by decision
- Original score, with an explicit note that an appeal does not adjust it
- Original and proposed risk level when a proposal exists
- One concise explanation and source location per challenged finding
- Current state: no change, awaiting human review, approved, or rejected
- Link to the detailed review page
- A statement that reassessment is evidence for review, not a safety guarantee

A hidden marker containing the review ID prevents duplicate replies. The bot ignores its own comments at ingress.

The first reply is posted after analysis. When a pending proposal is approved or rejected, the bot edits that same reply instead of adding a second long comment.

## Report presentation

Public repository and validation reports show:

- Original scan score and a linked verified-rescan score, when one exists
- Original and effective reviewed risk, when different
- Review status
- Exact commit used
- Number of challenged, confirmed, suppressed, changed, and unresolved findings
- Finding-level decision history and evidence
- Whether each change was AI-proposed and human-approved
- Link to the originating GitHub comment

The original report remains accessible. Badges use approved effective risk and install state, while their numerical score remains the original score until a verified normal rescan is linked. They never use an unapproved proposal.

## Security and abuse controls

- Verify webhook signatures before parsing or storing full content.
- Limit request body and comment sizes.
- Use delivery IDs and review IDs for idempotency.
- Require tracked AI Skill Shield issues and eligible author associations.
- Rate-limit reviews per repository and installation.
- Never execute content, follow comment links, or reveal prompts and credentials.
- Retrieve exact-commit evidence with least-privilege GitHub App tokens.
- Redact known secret patterns before remote model calls and logs.
- Use structured model output with strict validation.
- Escape all GitHub Markdown and report UI content derived from comments or repositories.
- Record model, prompt version, evidence hashes, and approval actor for auditability.

## Operational limits for the first release

- One active review per scan issue at a time.
- Up to 20 candidate findings per comment.
- Text files only, with bounded evidence windows.
- Comments must identify a finding through a file path, line, quoted title, or unambiguous finding description.
- New comments received during an active review are queued separately and run after it finishes.
- No appeal-derived numerical score changes.

## Testing strategy

### Unit tests

- Signature verification, payload validation, bot filtering, and author eligibility.
- Issue-to-notification matching and delivery idempotency.
- Stable finding-key generation.
- Claim-to-finding validation.
- Strict AI response parsing and rejection of invented evidence.
- Decision policy and approval state transitions.
- Effective finding construction and deterministic risk, summary, and install-verdict projection.
- GitHub reply formatting, escaping, and hidden markers.

### Integration tests

- Webhook receipt through queued review creation.
- Exact-SHA evidence retrieval with mocked GitHub responses.
- Retry behavior for GitHub, database, and model failures.
- Approval through review application and report projection.
- Exact-commit normal rescan linkage as the only source of a revised numerical score.
- Reply creation followed by approval-state edit.

### Regression fixture

Issue `pekral/ai-olympus#89` will be represented by a local fixture containing the challenged findings, owner comment, and relevant exact-commit excerpts. The expected result will prove that prohibited-pattern documentation can be classified as a false positive without treating repository text as instructions.

### Security tests

- Invalid and malformed webhook signatures.
- Prompt injection in comments and repository files.
- Oversized payloads and evidence.
- Forged repository, issue, scan, and finding identifiers.
- Duplicate deliveries and bot reply loops.
- Secret redaction and safe error logging.

## Delivery sequence

1. Add schema and migrations for events, reviews, decisions, applications, and queue state.
2. Add GitHub ingress authentication, normalization, eligibility, and idempotent queueing.
3. Add exact-commit evidence retrieval and stable finding identity.
4. Add strict claim extraction and finding adjudication.
5. Add deterministic proposal projection and approval actions.
6. Add GitHub reply creation and update behavior.
7. Add report review state and history.
8. Add regression, integration, security, and failure-recovery tests.

## Success criteria

- An eligible comment on a tracked scan issue creates exactly one review job.
- Every decision cites evidence from the exact scanned commit.
- No model output can directly choose or mutate a score.
- No appeal path directly changes a numerical validation score.
- The original scan and all revision history remain available.
- The GitHub reply and public report agree on review state, effective findings, risk, installation verdict, and numerical-score provenance.
- Duplicate webhooks, retries, and bot comments do not create duplicate reviews or replies.
- The issue #89 regression fixture yields reviewable false-positive proposals for documentation-only dangerous-pattern examples.
