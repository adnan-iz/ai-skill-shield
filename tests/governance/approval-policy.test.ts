import { describe, it, expect } from 'vitest'
import {
  evaluateGovernancePolicy,
  createApprovalChain,
  submitReview,
} from '@/lib/governance'
import type { ValidationResult, Finding } from '@/lib/validator/types'

function makeFinding(overrides: Partial<Finding> & { severity: Finding['severity'] }): Finding {
  return {
    id: overrides.id ?? 'f-001',
    axis: overrides.axis ?? 'security',
    severity: overrides.severity,
    category: overrides.category ?? 'general',
    title: overrides.title ?? 'test finding',
    message: overrides.message ?? 'test message',
    filePath: overrides.filePath,
    lineNumber: overrides.lineNumber,
    snippet: overrides.snippet,
    ruleId: overrides.ruleId,
  }
}

function makeResult(overrides: Partial<ValidationResult> = {}): ValidationResult {
  const riskLevel = overrides.riskLevel ?? 'safe'
  const overallScore = overrides.overallScore ?? 95
  const findings = overrides.findings ?? []

  const criticalCount = findings.filter((f) => f.severity === 'critical').length
  const highCount = findings.filter((f) => f.severity === 'high').length
  const mediumCount = findings.filter((f) => f.severity === 'medium').length
  const lowCount = findings.filter((f) => f.severity === 'low').length

  return {
    id: overrides.id ?? 'val-001',
    timestamp: overrides.timestamp ?? new Date().toISOString(),
    skillName: overrides.skillName ?? 'test-skill',
    overallScore,
    riskLevel,
    summary: overrides.summary ?? {
      totalChecks: 10,
      passed: 10 - findings.length,
      warnings: 0,
      failed: findings.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      infoCount: 0,
    },
    axes: overrides.axes ?? [],
    findings,
    compatibility: overrides.compatibility ?? {
      agents: [],
      overallCompatibility: 1,
    },
    tokenAnalysis: overrides.tokenAnalysis ?? {
      totalTokens: 100,
      frontmatterTokens: 10,
      bodyTokens: 90,
      isUnderLimit: true,
      limit: 8000,
      breakdown: [],
    },
    skillPreview: overrides.skillPreview ?? {
      frontmatter: {},
      body: '',
      fileTree: [],
    },
    source: overrides.source,
  }
}

describe('Enterprise Governance & Multi-Role Approval Chain Engine', () => {
  describe('evaluateGovernancePolicy', () => {
    it('auto-approves safe, high-scoring skills with no drift or secrets', () => {
      const result = makeResult({
        overallScore: 92,
        riskLevel: 'safe',
        findings: [],
      })

      const evalResult = evaluateGovernancePolicy(result)

      expect(evalResult.isAutoApproved).toBe(true)
      expect(evalResult.status).toBe('approved')
      expect(evalResult.requiredRoles).toEqual([])
      expect(evalResult.reasons.length).toBeGreaterThan(0)
      expect(evalResult.reasons[0]).toContain('auto-approval')
    })

    it('auto-approves low-risk skills that meet the minimum threshold', () => {
      const result = makeResult({
        overallScore: 85,
        riskLevel: 'low',
        findings: [],
      })

      const evalResult = evaluateGovernancePolicy(result)

      expect(evalResult.isAutoApproved).toBe(true)
      expect(evalResult.status).toBe('approved')
      expect(evalResult.requiredRoles).toEqual([])
    })

    it('requires auditor review if score is below auto-approval threshold', () => {
      const result = makeResult({
        overallScore: 84,
        riskLevel: 'safe',
        findings: [],
      })

      const evalResult = evaluateGovernancePolicy(result)

      expect(evalResult.isAutoApproved).toBe(false)
      expect(evalResult.status).toBe('needs_auditor_review')
      expect(evalResult.requiredRoles).toContain('security-auditor')
      expect(evalResult.reasons.some((r) => r.includes('below the minimum auto-approval threshold'))).toBe(true)
    })

    it('respects custom minScoreForAutoApproval in policy', () => {
      const result = makeResult({
        overallScore: 90,
        riskLevel: 'safe',
        findings: [],
      })

      const evalResult = evaluateGovernancePolicy(result, { minScoreForAutoApproval: 95 })

      expect(evalResult.isAutoApproved).toBe(false)
      expect(evalResult.status).toBe('needs_auditor_review')
      expect(evalResult.requiredRoles).toContain('security-auditor')
    })

    it('requires admin role and needs_admin_override status for critical-risk skills', () => {
      const finding = makeFinding({
        severity: 'critical',
        category: 'code-execution',
        message: 'Arbitrary remote code execution flaw detected',
      })
      const result = makeResult({
        overallScore: 40,
        riskLevel: 'critical',
        findings: [finding],
        summary: {
          criticalCount: 1,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          infoCount: 0,
          totalChecks: 10,
          passed: 5,
          warnings: 0,
          failed: 1,
        },
      })

      const evalResult = evaluateGovernancePolicy(result)

      expect(evalResult.isAutoApproved).toBe(false)
      expect(evalResult.status).toBe('needs_admin_override')
      expect(evalResult.requiredRoles).toContain('admin')
      expect(evalResult.reasons.some((r) => r.includes('Critical risk level'))).toBe(true)
    })

    it('requires security-auditor for high-risk skills', () => {
      const finding = makeFinding({
        severity: 'high',
        category: 'data-leakage',
        message: 'Unencrypted outbound transmission of environment tokens',
      })
      const result = makeResult({
        overallScore: 70,
        riskLevel: 'high',
        findings: [finding],
        summary: {
          criticalCount: 0,
          highCount: 1,
          mediumCount: 0,
          lowCount: 0,
          infoCount: 0,
          totalChecks: 10,
          passed: 8,
          warnings: 1,
          failed: 1,
        },
      })

      const evalResult = evaluateGovernancePolicy(result)

      expect(evalResult.isAutoApproved).toBe(false)
      expect(evalResult.status).toBe('needs_auditor_review')
      expect(evalResult.requiredRoles).toContain('security-auditor')
      expect(evalResult.reasons.some((r) => r.includes('High risk level'))).toBe(true)
    })

    it('requires security-auditor and compliance-officer for capability drift skills', () => {
      const driftFinding = makeFinding({
        severity: 'high',
        category: 'capability-drift',
        ruleId: 'SS-DRIFT-NET',
        title: 'Undeclared Network Activity (Capability Drift)',
        message: 'Skill declared no outbound network permissions, but fetch was detected.',
      })
      const result = makeResult({
        overallScore: 88,
        riskLevel: 'low',
        findings: [driftFinding],
      })

      const evalResult = evaluateGovernancePolicy(result)

      expect(evalResult.isAutoApproved).toBe(false)
      expect(evalResult.status).toBe('needs_auditor_review')
      expect(evalResult.requiredRoles).toContain('security-auditor')
      expect(evalResult.requiredRoles).toContain('compliance-officer')
      expect(evalResult.reasons.some((r) => r.includes('Capability drift detected'))).toBe(true)
    })

    it('requires security-auditor when secret findings are present', () => {
      const secretFinding = makeFinding({
        id: 'secret-1',
        severity: 'critical',
        category: 'secret-detection',
        title: 'OpenAI API Key',
        message: 'Hardcoded API key detected',
      })
      const result = makeResult({
        overallScore: 90,
        riskLevel: 'safe',
        findings: [secretFinding],
      })

      const evalResult = evaluateGovernancePolicy(result)

      expect(evalResult.isAutoApproved).toBe(false)
      expect(evalResult.requiredRoles).toContain('security-auditor')
      expect(evalResult.reasons.some((r) => r.includes('Hardcoded secrets'))).toBe(true)
    })

    it('requires admin role when findings match blockedCategories', () => {
      const finding = makeFinding({
        severity: 'medium',
        category: 'destructive-command',
        message: 'Command rm -rf detected',
      })
      const result = makeResult({
        overallScore: 90,
        riskLevel: 'safe',
        findings: [finding],
      })

      const evalResult = evaluateGovernancePolicy(result, {
        blockedCategories: ['destructive-command'],
      })

      expect(evalResult.isAutoApproved).toBe(false)
      expect(evalResult.status).toBe('needs_admin_override')
      expect(evalResult.requiredRoles).toContain('admin')
      expect(evalResult.reasons.some((r) => r.includes('blocked categories'))).toBe(true)
    })
  })

  describe('createApprovalChain', () => {
    it('creates an approval record initialized with evaluation metadata', () => {
      const evaluation = {
        isAutoApproved: false,
        status: 'needs_auditor_review' as const,
        requiredRoles: ['security-auditor' as const, 'compliance-officer' as const],
        reasons: ['High risk level detected', 'Capability drift detected'],
      }

      const record = createApprovalChain('skill-alpha', evaluation)

      expect(record.id).toBeDefined()
      expect(record.skillId).toBe('skill-alpha')
      expect(record.status).toBe('needs_auditor_review')
      expect(record.requiredRoles).toEqual(['security-auditor', 'compliance-officer'])
      expect(record.approvals).toEqual([])
      expect(record.rejections).toEqual([])
      expect(record.history.length).toBe(1)
      expect(record.history[0].action).toBe('created')
      expect(record.history[0].actor).toBe('system')
      expect(record.history[0].notes).toContain('High risk level detected')
    })
  })

  describe('submitReview', () => {
    it('progresses multi-step approval state machine until all required roles approve', () => {
      const evaluation = {
        isAutoApproved: false,
        status: 'needs_auditor_review' as const,
        requiredRoles: ['security-auditor' as const, 'compliance-officer' as const],
        reasons: ['Capability drift requires security and compliance review'],
      }

      const initialRecord = createApprovalChain('skill-beta', evaluation)

      // Step 1: Security Auditor approves
      const recordAfterAuditor = submitReview(
        initialRecord,
        { role: 'security-auditor', name: 'Alice Auditor' },
        'approve',
        'Security checks passed'
      )

      expect(recordAfterAuditor.status).not.toBe('approved')
      expect(recordAfterAuditor.status).toBe('needs_auditor_review')
      expect(recordAfterAuditor.approvals).toHaveLength(1)
      expect(recordAfterAuditor.approvals[0]).toEqual({
        role: 'security-auditor',
        reviewer: 'Alice Auditor',
        timestamp: expect.any(String),
        comments: 'Security checks passed',
      })
      expect(recordAfterAuditor.history).toHaveLength(2)
      expect(recordAfterAuditor.history[1].action).toBe('approved')
      expect(recordAfterAuditor.history[1].actor).toBe('Alice Auditor')

      // Step 2: Compliance Officer approves -> all required roles satisfied
      const recordAfterCompliance = submitReview(
        recordAfterAuditor,
        { role: 'compliance-officer', name: 'Bob Compliance' },
        'approve',
        'All policy mandates verified'
      )

      expect(recordAfterCompliance.status).toBe('approved')
      expect(recordAfterCompliance.approvals).toHaveLength(2)
      expect(recordAfterCompliance.approvals[1]).toEqual({
        role: 'compliance-officer',
        reviewer: 'Bob Compliance',
        timestamp: expect.any(String),
        comments: 'All policy mandates verified',
      })
      expect(recordAfterCompliance.history).toHaveLength(3)
    })

    it('transitions to rejected immediately if any reviewer rejects', () => {
      const evaluation = {
        isAutoApproved: false,
        status: 'needs_auditor_review' as const,
        requiredRoles: ['security-auditor' as const, 'compliance-officer' as const],
        reasons: ['Requires auditor and compliance approval'],
      }

      const record = createApprovalChain('skill-gamma', evaluation)

      const rejectedRecord = submitReview(
        record,
        { role: 'security-auditor', name: 'Eve Auditor' },
        'reject',
        'Suspicious outbound C2 traffic behavior detected'
      )

      expect(rejectedRecord.status).toBe('rejected')
      expect(rejectedRecord.rejections).toHaveLength(1)
      expect(rejectedRecord.rejections[0]).toEqual({
        role: 'security-auditor',
        reviewer: 'Eve Auditor',
        timestamp: expect.any(String),
        reason: 'Suspicious outbound C2 traffic behavior detected',
      })
      expect(rejectedRecord.history).toHaveLength(2)
      expect(rejectedRecord.history[1].action).toBe('rejected')
      expect(rejectedRecord.history[1].actor).toBe('Eve Auditor')
      expect(rejectedRecord.history[1].notes).toBe('Suspicious outbound C2 traffic behavior detected')
    })

    it('throws when attempting to review an already rejected record', () => {
      const evaluation = {
        isAutoApproved: false,
        status: 'needs_auditor_review' as const,
        requiredRoles: ['security-auditor' as const],
        reasons: ['Risk review needed'],
      }

      const record = createApprovalChain('skill-delta', evaluation)
      const rejectedRecord = submitReview(
        record,
        { role: 'security-auditor', name: 'Auditor 1' },
        'reject',
        'Block'
      )

      expect(() => {
        submitReview(
          rejectedRecord,
          { role: 'security-auditor', name: 'Auditor 2' },
          'approve'
        )
      }).toThrow('Cannot review an already rejected approval record')
    })

    it('throws when attempting to review an already approved record', () => {
      const evaluation = {
        isAutoApproved: false,
        status: 'needs_auditor_review' as const,
        requiredRoles: ['security-auditor' as const],
        reasons: ['Risk review needed'],
      }

      const record = createApprovalChain('skill-epsilon', evaluation)
      const approvedRecord = submitReview(
        record,
        { role: 'security-auditor', name: 'Auditor 1' },
        'approve',
        'Looks good'
      )

      expect(approvedRecord.status).toBe('approved')
      expect(() => {
        submitReview(
          approvedRecord,
          { role: 'admin', name: 'Admin 1' },
          'approve'
        )
      }).toThrow('Cannot review an already approved approval record')
    })
  })
})
