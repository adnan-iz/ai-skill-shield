# Scoring Model

AI Skill Shield calculates a weighted score across 11 validation axes. Finding severity determines the reported risk level, while repository audit and approval data contribute to the separate installation verdict shown in the report UI.

## Validation axes

| Axis | Weight |
| --- | ---: |
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

The current weights total 97%, so the maximum weighted score before risk caps is `97`.

## Overall score

The validator multiplies each axis score by its weight, sums the results, and rounds to the nearest integer. It then applies these severity caps:

- Any critical finding caps the overall score at `60`.
- Any high finding caps the overall score at `74`.

## Risk level

The validation risk level is the highest severity among the skill findings: `critical`, `high`, `medium`, `low`, or `safe`. Repository audit risk is stored separately and does not change the validation score or validation risk level.

## Approval threshold

By default, a validation score below `70` triggers an attempt to create a pending approval record.

## Installation verdict

The report derives a separate pre-install verdict from:

- Validation risk and finding severity
- Installation-related findings
- Repository audit findings and risk
- Approval status
- Repository trust metadata displayed in the decision checklist

Verdict labels are:

- `Safe to Review`
- `Needs Manual Review`
- `Do Not Install`

`Safe to Review` indicates that no blocking installation signals were detected; it is not a guarantee that a skill is safe to execute.
