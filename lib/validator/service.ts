import { createPendingApproval } from '@/lib/approvals'
import { getResult, saveResult } from '@/lib/store'
import { getCachedResultId, scanCacheKey, setCachedResultId } from '@/lib/scan-cache'
import { logAuditEvent, triggerWebhooks } from '@/lib/webhooks'
import { runFullValidation, type OrchestratorOptions } from '@/lib/validator/orchestrator'
import type { SkillInput, ValidationResult } from '@/lib/validator/types'

export function requiresApproval(result: Pick<ValidationResult, 'overallScore' | 'riskLevel'>): boolean {
  return result.overallScore < 70 || result.riskLevel === 'critical' || result.riskLevel === 'high'
}

export async function validateAndSave(
  input: SkillInput,
  options?: OrchestratorOptions
): Promise<ValidationResult> {
  const cacheKey = scanCacheKey(input)
  if (!options?.rescan) {
    const cachedId = await getCachedResultId(cacheKey)
    if (cachedId) {
      const cached = await getResult(cachedId)
      if (cached) return cached
    }
  }

  const result = await runFullValidation(input, options)
  await saveResult(result)
  await setCachedResultId(cacheKey, result.id)

  if (requiresApproval(result)) {
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
