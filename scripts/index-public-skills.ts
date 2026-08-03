import { NextRequest } from 'next/server'
import { POST as importGitHubSkill } from '@/app/api/github/route'
import { validateAndSave } from '@/lib/validator/service'
import type { RepositoryMeta, SkillFile } from '@/lib/validator/types'

function target(value: string) {
  const url = new URL(value)
  if (url.hostname !== 'github.com') throw new Error(`Not a GitHub URL: ${value}`)
  const [owner, repo, marker, branch = 'main', ...rest] = url.pathname.split('/').filter(Boolean)
  if (!owner || !repo) throw new Error(`Missing owner or repository: ${value}`)
  const path = marker === 'blob' || marker === 'tree' ? rest.join('/').replace(/\/?SKILL\.md$/i, '') : ''
  return { owner, repo, branch, path }
}

async function importRawSkill(owner: string, repo: string, branch: string, path: string) {
  const feed = await fetch(`https://github.com/${owner}/${repo}/commits/${encodeURIComponent(branch)}.atom`)
  const sha = (await feed.text()).match(/Commit\/([0-9a-f]{40})/i)?.[1]
  if (!feed.ok || !sha) throw new Error(`${owner}/${repo}: could not resolve ${branch}`)
  const skillPath = [...path.split('/').filter(Boolean), 'SKILL.md'].map(encodeURIComponent).join('/')
  const raw = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${skillPath}`)
  if (!raw.ok) throw new Error(`${owner}/${repo}: could not fetch ${skillPath}`)
  const source = {
    type: 'github' as const,
    url: `https://github.com/${owner}/${repo}`,
    owner, repo, path, branch, sha,
    repositoryMeta: publicRepositoryMeta(owner, repo, branch),
  }
  return validateAndSave({ files: [{ path: skillPath, content: await raw.text() }], source }, { source })
}

function publicRepositoryMeta(owner: string, repo: string, branch: string): RepositoryMeta {
  return {
    fullName: `${owner}/${repo}`,
    isPrivate: false,
    stars: 0,
    forks: 0,
    openIssues: 0,
    archived: false,
    defaultBranch: branch,
    isDefaultBranchHead: true,
  }
}

async function main() {
  for (const value of process.argv.slice(2)) {
    const { owner, repo, branch, path } = target(value)
    const response = await importGitHubSkill(new NextRequest('http://localhost/api/github', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': `index:${owner}` },
      body: JSON.stringify({ owner, repo, path }),
    }))
    const payload = await response.json() as {
      files?: SkillFile[]
      branch?: string
      sha?: string
      path?: string
      repositoryAudit?: never
      repositoryMeta?: RepositoryMeta
      validationResultId?: string
      error?: string
    }
    if (!response.ok) {
      if (String(payload.error).includes('API limit')) {
        const result = await importRawSkill(owner, repo, branch, path)
        console.log(`${owner}/${repo}/${path}: ${result.overallScore} (${result.id}, raw fallback)`)
        continue
      }
      throw new Error(`${owner}/${repo}: ${payload.error || response.statusText}`)
    }
    if (payload.validationResultId) {
      console.log(`${owner}/${repo}: indexed batch ${payload.validationResultId}`)
      continue
    }
    if (!payload.files?.length) throw new Error(`${owner}/${repo}: no skill files found`)

    const source = {
      type: 'github' as const,
      url: `https://github.com/${owner}/${repo}`,
      owner,
      repo,
      path: payload.path,
      branch: payload.branch,
      sha: payload.sha,
      repositoryAudit: payload.repositoryAudit,
      repositoryMeta: payload.repositoryMeta || publicRepositoryMeta(owner, repo, payload.branch || branch),
    }
    const result = await validateAndSave({ files: payload.files, source }, { source })
    console.log(`${owner}/${repo}/${payload.path}: ${result.overallScore} (${result.id})`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
