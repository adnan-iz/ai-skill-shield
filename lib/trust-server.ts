import 'server-only'

import { cache } from 'react'
import { getLatestGitHubResult } from '@/lib/store'
import { parseGitHubTrustTarget } from '@/lib/trust'

async function isPublicGitHubRepository(owner: string, repo: string): Promise<boolean> {
  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    }
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
      next: { revalidate: 300 },
    })

    if (!response.ok) return false
    const data = await response.json() as { private?: boolean }
    return data.private === false
  } catch {
    return false
  }
}

export const getPublicTrustResult = cache(async (
  owner: string,
  repo: string,
  path?: string | string[]
) => {
  const target = parseGitHubTrustTarget(owner, repo, path)
  if (!target) return undefined

  const result = await getLatestGitHubResult(target.owner, target.repo, target.path)
  if (!result?.source?.sha || result.source.repositoryMeta?.isDefaultBranchHead !== true) return undefined
  if (result.source.repositoryMeta.isPrivate !== false) return undefined
  if (!await isPublicGitHubRepository(target.owner, target.repo)) return undefined

  return result
})
