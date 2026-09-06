import { describe, expect, it } from 'vitest'
import type { SkillFile } from '@/lib/validator/types'
import {
  computeSkillDigest,
  embedSignatureInSkill,
  extractSignatureFromSkill,
  generateSigningKeyPair,
  signSkillPackage,
  verifySkillPackage,
  type SkillSignature,
} from '@/lib/signing'

describe('Cryptographic Signing & Provenance Verification Engine', () => {
  const sampleFiles: SkillFile[] = [
    {
      path: 'SKILL.md',
      content: `---\nname: secure-agent\nversion: 1.0.0\n---\n\n# Secure Agent\n\nRuns automated security checks safely.\n`,
    },
    {
      path: 'scripts/run.sh',
      content: '#!/usr/bin/env bash\necho "Running security check..."\n',
    },
    {
      path: 'config.json',
      content: '{\n  "mode": "strict"\n}\n',
    },
  ]

  describe('generateSigningKeyPair', () => {
    it('generates valid Ed25519 keypairs with PEM headers', async () => {
      const keyPair = await generateSigningKeyPair()

      expect(keyPair).toHaveProperty('publicKey')
      expect(keyPair).toHaveProperty('privateKey')

      expect(keyPair.publicKey).toContain('-----BEGIN PUBLIC KEY-----')
      expect(keyPair.publicKey).toContain('-----END PUBLIC KEY-----')
      expect(keyPair.privateKey).toContain('-----BEGIN PRIVATE KEY-----')
      expect(keyPair.privateKey).toContain('-----END PRIVATE KEY-----')
    })

    it('generates unique keypairs on consecutive invocations', async () => {
      const pair1 = await generateSigningKeyPair()
      const pair2 = await generateSigningKeyPair()

      expect(pair1.publicKey).not.toEqual(pair2.publicKey)
      expect(pair1.privateKey).not.toEqual(pair2.privateKey)
    })
  })

  describe('computeSkillDigest', () => {
    it('computes deterministic SHA-256 digest regardless of file order', () => {
      const digest1 = computeSkillDigest(sampleFiles)
      const digest2 = computeSkillDigest([sampleFiles[2], sampleFiles[0], sampleFiles[1]])

      expect(digest1).toBeTypeOf('string')
      expect(digest1).toHaveLength(64)
      expect(digest1).toEqual(digest2)
    })

    it('normalizes Windows backslashes and relative prefixes', () => {
      const filesA: SkillFile[] = [
        { path: './scripts/run.sh', content: 'echo hello\n' },
        { path: 'SKILL.md', content: '# Skill\n' },
      ]
      const filesB: SkillFile[] = [
        { path: 'scripts\\run.sh', content: 'echo hello\n' },
        { path: '/SKILL.md', content: '# Skill\n' },
      ]

      expect(computeSkillDigest(filesA)).toEqual(computeSkillDigest(filesB))
    })

    it('ignores embedded signature block when computing digest', () => {
      const originalDigest = computeSkillDigest(sampleFiles)

      const fakeSig = {
        algorithm: 'ed25519' as const,
        publicKey: 'mock-pub',
        signature: 'mock-sig',
        timestamp: '2026-09-06T12:00:00.000Z',
        contentHash: originalDigest,
      }

      const filesWithEmbeddedSig: SkillFile[] = [
        {
          path: 'SKILL.md',
          content: embedSignatureInSkill(sampleFiles[0].content, fakeSig),
        },
        sampleFiles[1],
        sampleFiles[2],
      ]

      expect(computeSkillDigest(filesWithEmbeddedSig)).toEqual(originalDigest)
    })
  })

  describe('signSkillPackage and verifySkillPackage', () => {
    it('signs and verifies a valid skill package', async () => {
      const keyPair = await generateSigningKeyPair()
      const signerIdentity = 'security-team@skillshield.io'

      const signature = await signSkillPackage(sampleFiles, keyPair.privateKey, signerIdentity)

      expect(signature.algorithm).toBe('ed25519')
      expect(signature.signerIdentity).toBe(signerIdentity)
      expect(signature.publicKey).toBe(keyPair.publicKey)
      expect(signature.contentHash).toBe(computeSkillDigest(sampleFiles))
      expect(signature.signature).toBeTypeOf('string')
      expect(signature.signature.length).toBeGreaterThan(0)

      const result = await verifySkillPackage(sampleFiles, signature)

      expect(result.isValid).toBe(true)
      expect(result.tampered).toBe(false)
      expect(result.signerIdentity).toBe(signerIdentity)
      expect(result.timestamp).toBe(signature.timestamp)
      expect(result.error).toBeUndefined()
    })

    it('signs and verifies without an optional signerIdentity', async () => {
      const keyPair = await generateSigningKeyPair()

      const signature = await signSkillPackage(sampleFiles, keyPair.privateKey)

      expect(signature.signerIdentity).toBeUndefined()

      const result = await verifySkillPackage(sampleFiles, signature)

      expect(result.isValid).toBe(true)
      expect(result.tampered).toBe(false)
      expect(result.signerIdentity).toBeUndefined()
    })
  })

  describe('Tamper detection', () => {
    it('detects tampering when file content is altered', async () => {
      const keyPair = await generateSigningKeyPair()
      const signature = await signSkillPackage(sampleFiles, keyPair.privateKey, 'alice@example.com')

      const tamperedFiles: SkillFile[] = [
        sampleFiles[0],
        {
          path: 'scripts/run.sh',
          content: '#!/usr/bin/env bash\necho "Tampered payload!"\n',
        },
        sampleFiles[2],
      ]

      const result = await verifySkillPackage(tamperedFiles, signature)

      expect(result.isValid).toBe(false)
      expect(result.tampered).toBe(true)
      expect(result.error).toContain('tampered')
    })

    it('detects tampering when a file path is changed', async () => {
      const keyPair = await generateSigningKeyPair()
      const signature = await signSkillPackage(sampleFiles, keyPair.privateKey)

      const tamperedFiles: SkillFile[] = [
        sampleFiles[0],
        {
          path: 'scripts/run_tampered.sh',
          content: sampleFiles[1].content,
        },
        sampleFiles[2],
      ]

      const result = await verifySkillPackage(tamperedFiles, signature)

      expect(result.isValid).toBe(false)
      expect(result.tampered).toBe(true)
    })

    it('detects tampering when a file is deleted or added', async () => {
      const keyPair = await generateSigningKeyPair()
      const signature = await signSkillPackage(sampleFiles, keyPair.privateKey)

      // File removed
      const filesMinusOne = [sampleFiles[0], sampleFiles[1]]
      const resultRemoval = await verifySkillPackage(filesMinusOne, signature)
      expect(resultRemoval.isValid).toBe(false)
      expect(resultRemoval.tampered).toBe(true)

      // Extra file added
      const filesPlusOne = [
        ...sampleFiles,
        { path: 'malicious.py', content: 'import os; os.system("echo evil")\n' },
      ]
      const resultAddition = await verifySkillPackage(filesPlusOne, signature)
      expect(resultAddition.isValid).toBe(false)
      expect(resultAddition.tampered).toBe(true)
    })
  })

  describe('embedSignatureInSkill and extractSignatureFromSkill', () => {
    it('embeds signature block into SKILL.md and extracts it faithfully', async () => {
      const keyPair = await generateSigningKeyPair()
      const signature = await signSkillPackage(sampleFiles, keyPair.privateKey, 'publisher@store.org')

      const skillContent = sampleFiles[0].content
      const embedded = embedSignatureInSkill(skillContent, signature)

      expect(embedded).toContain('---signature')
      expect(embedded).toContain(signature.signature)
      expect(embedded).toContain('publisher@store.org')

      const extracted = extractSignatureFromSkill(embedded)

      expect(extracted).not.toBeNull()
      expect(extracted).toEqual(signature)
    })

    it('replaces existing signature block when re-embedding', async () => {
      const keyPair = await generateSigningKeyPair()
      const sig1 = await signSkillPackage(sampleFiles, keyPair.privateKey, 'first@example.com')
      const sig2 = await signSkillPackage(sampleFiles, keyPair.privateKey, 'second@example.com')

      const embedded1 = embedSignatureInSkill(sampleFiles[0].content, sig1)
      const embedded2 = embedSignatureInSkill(embedded1, sig2)

      // Should only have one ---signature block
      const count = (embedded2.match(/---signature/g) || []).length
      expect(count).toBe(1)

      const extracted = extractSignatureFromSkill(embedded2)
      expect(extracted?.signerIdentity).toBe('second@example.com')
    })

    it('returns null when extracting from skill content without a signature', () => {
      expect(extractSignatureFromSkill(sampleFiles[0].content)).toBeNull()
      expect(extractSignatureFromSkill('')).toBeNull()
      expect(extractSignatureFromSkill('---signature\nmalformed: [unclosed\n---')).toBeNull()
    })

    it('allows full end-to-end flow with embedded signature in package files', async () => {
      const keyPair = await generateSigningKeyPair()
      const signature = await signSkillPackage(sampleFiles, keyPair.privateKey, 'author@example.com')

      // SKILL.md has the signature embedded
      const packagedFiles: SkillFile[] = [
        {
          path: sampleFiles[0].path,
          content: embedSignatureInSkill(sampleFiles[0].content, signature),
        },
        sampleFiles[1],
        sampleFiles[2],
      ]

      // Extract signature from SKILL.md and verify package
      const extractedSig = extractSignatureFromSkill(packagedFiles[0].content)
      expect(extractedSig).not.toBeNull()

      const verification = await verifySkillPackage(packagedFiles, extractedSig!)
      expect(verification.isValid).toBe(true)
      expect(verification.tampered).toBe(false)
      expect(verification.signerIdentity).toBe('author@example.com')
    })
  })

  describe('Rejection of invalid keys or corrupted signatures', () => {
    it('rejects verification if signature was forged by a different private key', async () => {
      const legitimateKey = await generateSigningKeyPair()
      const attackerKey = await generateSigningKeyPair()

      // Attacker signs the files
      const forgedSig = await signSkillPackage(sampleFiles, attackerKey.privateKey, 'victim@example.com')

      // But claims legitimate public key
      forgedSig.publicKey = legitimateKey.publicKey

      const result = await verifySkillPackage(sampleFiles, forgedSig)

      expect(result.isValid).toBe(false)
      expect(result.tampered).toBe(false)
      expect(result.error).toContain('Cryptographic signature verification failed')
    })

    it('rejects corrupted signature payload', async () => {
      const keyPair = await generateSigningKeyPair()
      const signature = await signSkillPackage(sampleFiles, keyPair.privateKey)

      // Corrupt the signature base64 string
      const corruptedSig = {
        ...signature,
        signature: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      }

      const result = await verifySkillPackage(sampleFiles, corruptedSig)

      expect(result.isValid).toBe(false)
      expect(result.tampered).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('rejects malformed public key PEM', async () => {
      const keyPair = await generateSigningKeyPair()
      const signature = await signSkillPackage(sampleFiles, keyPair.privateKey)

      const brokenKeySig = {
        ...signature,
        publicKey: '-----BEGIN PUBLIC KEY-----\nNOT_VALID_BASE64!\n-----END PUBLIC KEY-----',
      }

      const result = await verifySkillPackage(sampleFiles, brokenKeySig)

      expect(result.isValid).toBe(false)
      expect(result.tampered).toBe(false)
      expect(result.error).toContain('Invalid public key or corrupted signature')
    })

    it('rejects unsupported algorithm', async () => {
      const keyPair = await generateSigningKeyPair()
      const signature = await signSkillPackage(sampleFiles, keyPair.privateKey)

      const wrongAlgoSig = {
        ...signature,
        algorithm: 'rsa' as unknown as SkillSignature['algorithm'],
      }

      const result = await verifySkillPackage(sampleFiles, wrongAlgoSig)

      expect(result.isValid).toBe(false)
      expect(result.tampered).toBe(false)
      expect(result.error).toContain('Unsupported signing algorithm')
    })

    it('rejects incomplete signature object', async () => {
      const result = await verifySkillPackage(sampleFiles, {} as unknown as SkillSignature)
      expect(result.isValid).toBe(false)
      expect(result.tampered).toBe(false)
      expect(result.error).toContain('missing required fields')
    })
  })
})
