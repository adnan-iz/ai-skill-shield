import { createPendingApproval } from '@/lib/approvals'
import { saveResult } from '@/lib/store'
import { logAuditEvent, triggerWebhooks } from '@/lib/webhooks'
import { runFullValidation, type OrchestratorOptions } from '@/lib/validator/orchestrator'
import type { SkillInput, ValidationResult } from '@/lib/validator/types'

export async function validateAndSave(
  input: SkillInput,
  options?: OrchestratorOptions
): Promise<ValidationResult> {
  const result = await runFullValidation(input, options)
  await saveResult(result)

  if (result.overallScore < 70) {
    try {
      await createPendingApproval(result.id)
    } catch {
      // Approval creation must not break the scan response.
    }
  }

  try {
    await logAuditEvent('scan.completed', result.id, {
      skillName: result.skillName,
      score: result.overallScore,
      riskLevel: result.riskLevel,
    })
    await triggerWebhooks('scan.completed', result.id, {
      score: result.overallScore,
      riskLevel: result.riskLevel,
      skillName: result.skillName,
      findingsCount: result.findings.length,
      criticalCount: result.summary.criticalCount,
      highCount: result.summary.highCount,
      sourceUrl: result.source?.url,
    })
  } catch {
    // Webhook/audit failures must not break the scan response.
  }

  return result
}
