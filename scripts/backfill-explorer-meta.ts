#!/usr/bin/env node
/**
 * Backfill metadata columns for existing validation_results rows.
 * Run once after deploying the schema migration.
 *
 * Usage: npx tsx scripts/backfill-explorer-meta.ts
 */

import { Pool } from 'pg'
import { gzipSync, gunzipSync } from 'node:zlib'
import { normalizeValidationResult } from '../lib/validator/normalize-result'
import { trustTargetForResult } from '../lib/trust'
import type { ValidationResult } from '../lib/validator/types'

const CATEGORIES: [string, RegExp][] = [
  ['Security', /security|secure|audit|scanner|compliance|vulnerab|threat/],
  ['Browser Automation', /browser|chrome|playwright|scrap|crawl|website/],
  ['Data & Analytics', /data|database|sql|analytics|spreadsheet|csv/],
  ['Design & Creative', /design|image|video|audio|figma|creative/],
  ['Documents', /document|writing|pdf|slide|presentation/],
  ['DevOps', /deploy|cloud|docker|kubernetes|ci\/?cd|infrastructure/],
  ['Testing', /test|testing|debug|quality assurance|\bqa\b/],
  ['Communication', /email|slack|message|social|communication/],
]

function parseResult(value: string): ValidationResult {
  const json = value.startsWith('gzip:')
    ? gunzipSync(Buffer.from(value.slice('gzip:'.length), 'base64')).toString('utf8')
    : value
  return normalizeValidationResult(JSON.parse(json) as ValidationResult)
}

function extractMeta(result: ValidationResult) {
  const target = trustTargetForResult(result)
  const source = result.source
  const description = source?.repositoryMeta?.description || ''
  const categoryText = `${result.skillName} ${target?.path || ''} ${description}`.toLowerCase()
  const category = CATEGORIES.find(([, pattern]) => pattern.test(categoryText))?.[0] || 'Developer Tools'
  const searchable = [target?.owner, target?.repo, target?.path, result.skillName, category, description].filter(Boolean).join(' ').toLowerCase()

  return {
    sourceOwner: target?.owner || source?.owner || null,
    sourceRepo: target?.repo || source?.repo || null,
    sourcePath: target?.path || null,
    sourceType: source?.type || null,
    skillName: result.skillName,
    overallScore: result.overallScore,
    riskLevel: result.riskLevel,
    findingsCount: result.findings.length,
    category,
    description,
    searchable,
  }
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL?.trim(),
  })

  const countResult = await pool.query(
    'SELECT COUNT(*) as total FROM validation_results WHERE source_type IS NULL'
  )
  const total = parseInt(countResult.rows[0].total, 10)
  console.log(`Found ${total} rows to backfill`)

  if (total === 0) {
    console.log('Nothing to backfill')
    await pool.end()
    return
  }

  const BATCH = 500
  let updated = 0

  for (let offset = 0; offset < total; offset += BATCH) {
    const rows = await pool.query(
      'SELECT id, result FROM validation_results WHERE source_type IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [BATCH, offset]
    )

    for (const row of rows.rows) {
      try {
        const result = parseResult(row.result)
        const meta = extractMeta(result)
        await pool.query(
          `UPDATE validation_results SET
            source_owner = $1, source_repo = $2, source_path = $3, source_type = $4,
            skill_name = $5, overall_score = $6, risk_level = $7, findings_count = $8,
            category = $9, description = $10, searchable = $11
          WHERE id = $12`,
          [
            meta.sourceOwner, meta.sourceRepo, meta.sourcePath, meta.sourceType,
            meta.skillName, meta.overallScore, meta.riskLevel, meta.findingsCount,
            meta.category, meta.description, meta.searchable, row.id,
          ]
        )
        updated++
      } catch (e) {
        console.error(`Failed to backfill ${row.id}:`, (e as Error).message)
      }
    }
    console.log(`Progress: ${Math.min(offset + BATCH, total)}/${total} (${updated} updated)`)
  }

  console.log(`Backfill complete: ${updated}/${total} rows updated`)
  await pool.end()
}

main().catch((e) => {
  console.error('Backfill failed:', e)
  process.exit(1)
})
