# Scoring Model

SkillShield calculates an overall score from 11 weighted axes and then combines that with finding severity and repository audit results to shape the install decision shown in the UI.

## Axes

| Axis | Weight |
|---|---|
| Security | 25% |
| Frontmatter | 18% |
| Quality | 12% |
| Structure | 10% |
| Installation | 7% |
| Naming | 5% |
| Tokens | 5% |
| Compatibility | 5% |
| Content | 5% |
| Dependencies | 3% |
| Best Practices | 2% |

## Overall score

The overall score is the weighted sum of axis scores, rounded to the nearest integer.

## Risk level

The score is not the only signal. Risk level is also influenced by finding severity, including critical install-time behavior and repository audit findings.

## Approval threshold

By default, scans below `70` create a pending approval record.

## Install verdict

The top-level report verdict uses more than score alone. It combines:

- overall score and risk level
- install-related findings
- repository audit findings
- repository trust metadata
- approval status

Current verdict labels:

- `Safe to Review`
- `Needs Manual Review`
- `Do Not Install`
