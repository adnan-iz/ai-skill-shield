export interface CycloneDxProperty {
  name: string
  value: string
}

export interface CycloneDxTool {
  vendor?: string
  name: string
  version?: string
}

export interface CycloneDxComponent {
  type: 'application' | 'framework' | 'library' | 'file' | 'service' | string
  name: string
  version?: string
  description?: string
  purl?: string
  properties?: CycloneDxProperty[]
  components?: CycloneDxComponent[]
}

export interface CycloneDxRating {
  source?: {
    name?: string
    url?: string
  }
  score?: number
  severity?: string
  method?: string
}

export interface CycloneDxVulnerabilityAffect {
  ref: string
}

export interface CycloneDxVulnerability {
  id: string
  source?: {
    name?: string
    url?: string
  }
  ratings?: CycloneDxRating[]
  description?: string
  detail?: string
  recommendation?: string
  affects?: CycloneDxVulnerabilityAffect[]
  properties?: CycloneDxProperty[]
}

export interface CycloneDxMetadata {
  timestamp: string
  tools?: CycloneDxTool[]
  component?: CycloneDxComponent
  properties?: CycloneDxProperty[]
}

export interface CycloneDxBom {
  bomFormat: 'CycloneDX'
  specVersion: '1.5'
  serialNumber: string
  version: number
  metadata: CycloneDxMetadata
  components: CycloneDxComponent[]
  vulnerabilities?: CycloneDxVulnerability[]
}
