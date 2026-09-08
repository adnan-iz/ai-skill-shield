import { NextRequest } from 'next/server'
import { listSkills, publishSkill } from '@/lib/registry'

export async function GET(request: NextRequest | Request) {
  try {
    const url = new URL(request.url)
    const tag = url.searchParams.get('tag') || undefined
    const q = url.searchParams.get('q') || undefined
    const includeDeprecated = url.searchParams.get('includeDeprecated') === 'true'

    const skills = listSkills({ tag, query: q, includeDeprecated })
    return Response.json({ skills }, { status: 200 })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest | Request) {
  try {
    let body: Record<string, unknown>
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!body || typeof body !== 'object') {
      return Response.json({ error: 'Request body must be an object' }, { status: 400 })
    }

    const { files, signature, author, tags } = body
    if (!files || !Array.isArray(files) || files.length === 0) {
      return Response.json({ error: 'Missing or invalid "files" array' }, { status: 400 })
    }

    if (!signature || typeof signature !== 'object') {
      return Response.json({ error: 'Missing or invalid "signature" object' }, { status: 400 })
    }

    if (!author || typeof author !== 'string') {
      return Response.json({ error: 'Missing or invalid "author" string' }, { status: 400 })
    }

    const result = await publishSkill({
      files: files as import('@/lib/validator/types').SkillFile[],
      signature: signature as import('@/lib/signing').SkillSignature,
      author,
      tags: Array.isArray(tags) ? (tags as string[]) : undefined,
    })

    if (!result.success || !result.skill) {
      return Response.json({ error: result.error || 'Failed to publish skill' }, { status: 400 })
    }

    return Response.json(
      {
        skill: result.skill,
        ...result.skill,
      },
      { status: 201 }
    )
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 400 }
    )
  }
}
