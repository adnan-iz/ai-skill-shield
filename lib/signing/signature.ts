import { createHash, createPublicKey, generateKeyPair, sign, verify } from 'node:crypto'
import { parse, stringify } from 'yaml'
import type { SkillFile } from '@/lib/validator/types'
import type { KeyPair, SkillSignature, VerificationResult } from './types'

/**
 * Normalizes a file path to canonical POSIX style without leading relative prefixes.
 */
function normalizeFilePath(filePath: string): string {
  return filePath
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
}

/**
 * Normalizes line endings to \n for deterministic hashing across platforms.
 */
function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, '\n')
}

/**
 * Strips the embedded `---signature` block from a markdown skill file content.
 */
export function stripSignatureFromSkill(content: string): string {
  return content
    .replace(/(?:\r?\n|^)---signature[\s\S]*?(?:\r?\n---(?:\r?\n|$)|$)/g, '')
    .trimEnd()
}

/**
 * Generates an Ed25519 public/private keypair encoded in PEM format.
 */
export async function generateSigningKeyPair(): Promise<KeyPair> {
  return new Promise((resolve, reject) => {
    generateKeyPair(
      'ed25519',
      {
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      },
      (err, publicKey, privateKey) => {
        if (err) return reject(err)
        resolve({
          publicKey: publicKey.trim(),
          privateKey: privateKey.trim(),
        })
      }
    )
  })
}

/**
 * Computes a deterministic SHA-256 digest of a skill package.
 * Files are sorted canonically by normalized file path.
 * Signature blocks within files (if any) are stripped to ensure signature neutrality.
 */
export function computeSkillDigest(files: SkillFile[]): string {
  const sorted = [...files].sort((a, b) => {
    const pathA = normalizeFilePath(a.path)
    const pathB = normalizeFilePath(b.path)
    return pathA.localeCompare(pathB)
  })

  const hash = createHash('sha256')
  for (const file of sorted) {
    const normPath = normalizeFilePath(file.path)
    const cleanContent = normalizeLineEndings(stripSignatureFromSkill(file.content))
    hash.update(normPath)
    hash.update('\n')
    hash.update(cleanContent)
    hash.update('\n')
  }

  return hash.digest('hex')
}

/**
 * Signs a skill package with an Ed25519 private key.
 */
export async function signSkillPackage(
  files: SkillFile[],
  privateKey: string,
  signerIdentity?: string
): Promise<SkillSignature> {
  const contentHash = computeSkillDigest(files)
  const timestamp = new Date().toISOString()

  let publicKeyPem: string
  try {
    const pubKeyObj = createPublicKey(privateKey)
    publicKeyPem = pubKeyObj.export({ type: 'spki', format: 'pem' }).toString().trim()
  } catch (err) {
    throw new Error(`Failed to derive public key from private key: ${(err as Error).message}`)
  }

  const sigBuffer = sign(null, Buffer.from(contentHash, 'utf8'), privateKey)
  const signature = sigBuffer.toString('base64')

  return {
    algorithm: 'ed25519',
    publicKey: publicKeyPem,
    signature,
    timestamp,
    ...(signerIdentity ? { signerIdentity } : {}),
    contentHash,
  }
}

/**
 * Verifies the provenance and integrity of a skill package against a SkillSignature.
 */
export async function verifySkillPackage(
  files: SkillFile[],
  signature: SkillSignature
): Promise<VerificationResult> {
  if (!signature || !signature.contentHash || !signature.publicKey || !signature.signature) {
    return {
      isValid: false,
      tampered: false,
      error: 'Invalid signature object: missing required fields',
    }
  }

  if (signature.algorithm !== 'ed25519') {
    return {
      isValid: false,
      tampered: false,
      signerIdentity: signature.signerIdentity,
      timestamp: signature.timestamp,
      error: `Unsupported signing algorithm: ${signature.algorithm}`,
    }
  }

  // 1. Verify content integrity (hash comparison)
  const computedHash = computeSkillDigest(files)
  if (computedHash !== signature.contentHash) {
    return {
      isValid: false,
      tampered: true,
      signerIdentity: signature.signerIdentity,
      timestamp: signature.timestamp,
      error: `Skill package content has been tampered with: expected digest ${signature.contentHash}, got ${computedHash}`,
    }
  }

  // 2. Verify Ed25519 cryptographic signature against public key
  try {
    const pubKey = createPublicKey(signature.publicKey)
    let sigBuffer: Buffer
    if (/^[0-9a-fA-F]+$/.test(signature.signature) && signature.signature.length === 128) {
      sigBuffer = Buffer.from(signature.signature, 'hex')
    } else {
      sigBuffer = Buffer.from(signature.signature, 'base64')
    }

    const isSigValid = verify(null, Buffer.from(signature.contentHash, 'utf8'), pubKey, sigBuffer)

    if (!isSigValid) {
      return {
        isValid: false,
        tampered: false,
        signerIdentity: signature.signerIdentity,
        timestamp: signature.timestamp,
        error: 'Cryptographic signature verification failed: signature does not match public key and content hash',
      }
    }

    return {
      isValid: true,
      tampered: false,
      signerIdentity: signature.signerIdentity,
      timestamp: signature.timestamp,
    }
  } catch (err) {
    return {
      isValid: false,
      tampered: false,
      signerIdentity: signature.signerIdentity,
      timestamp: signature.timestamp,
      error: `Invalid public key or corrupted signature: ${(err as Error).message}`,
    }
  }
}

/**
 * Embeds a SkillSignature into a markdown skill file by appending or replacing the `---signature` block.
 */
export function embedSignatureInSkill(skillContent: string, signature: SkillSignature): string {
  const baseContent = stripSignatureFromSkill(skillContent)
  const yamlBlock = stringify(signature).trim()
  return baseContent ? `${baseContent}\n\n---signature\n${yamlBlock}\n---\n` : `---signature\n${yamlBlock}\n---\n`
}

/**
 * Extracts and parses a SkillSignature from a markdown skill file containing a `---signature` block.
 */
export function extractSignatureFromSkill(skillContent: string): SkillSignature | null {
  if (!skillContent) return null
  const match = skillContent.match(/(?:\r?\n|^)---signature\r?\n([\s\S]*?)(?:\r?\n---(?:\r?\n|$)|$)/)
  if (!match || !match[1]) return null

  try {
    const raw = parse(match[1])
    if (!raw || typeof raw !== 'object') return null
    if (
      raw.algorithm === 'ed25519' &&
      typeof raw.publicKey === 'string' &&
      typeof raw.signature === 'string' &&
      typeof raw.timestamp === 'string' &&
      typeof raw.contentHash === 'string'
    ) {
      return {
        algorithm: 'ed25519',
        publicKey: raw.publicKey,
        signature: raw.signature,
        timestamp: raw.timestamp,
        ...(raw.signerIdentity && typeof raw.signerIdentity === 'string'
          ? { signerIdentity: raw.signerIdentity }
          : {}),
        contentHash: raw.contentHash,
      }
    }
    return null
  } catch {
    return null
  }
}
