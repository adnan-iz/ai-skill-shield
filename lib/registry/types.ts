import type { SkillSignature } from '@/lib/signing'
import type { SkillFile } from '@/lib/validator/types'

export interface RegistrySkill {
  id: string
  name: string
  version: string
  description: string
  author: string
  publishedAt: string
  signature: SkillSignature
  validationSummary: {
    overallScore: number
    riskLevel: string
    cacheEfficiencyScore?: number
  }
  tags: string[]
  downloadCount: number
  isDeprecated: boolean
  deprecationReason?: string
}

export interface PublishRequest {
  files: SkillFile[]
  signature: SkillSignature
  author: string
  tags?: string[]
}
