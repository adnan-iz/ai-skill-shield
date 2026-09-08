export interface KeyPair {
  publicKey: string
  privateKey: string
}

export interface SkillSignature {
  algorithm: 'ed25519'
  publicKey: string
  signature: string
  timestamp: string
  signerIdentity?: string
  contentHash: string
}

export interface VerificationResult {
  isValid: boolean
  signerIdentity?: string
  timestamp?: string
  error?: string
  tampered: boolean
}
