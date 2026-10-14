import { createHash } from 'node:crypto'

type RecordValue = Record<string, unknown>

function object(value: unknown): value is RecordValue {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function snapshots(input: unknown) {
  const records = Array.isArray(input) ? input : object(input) ? input.servers : undefined
  if (!Array.isArray(records) || records.length > 5000) throw new Error('Invalid or oversized registry snapshot')
  const result = new Map<string, { normalized: RecordValue; hash: string }>()
  let nodes = 0
  function canonical(value: unknown, depth = 0): string {
    if (++nodes > 100_000 || depth > 64) throw new Error('Registry snapshot exceeds structure limit')
    if (Array.isArray(value)) return `[${value.map(item => canonical(item, depth + 1)).join(',')}]`
    if (object(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key], depth + 1)}`).join(',')}}`
    return JSON.stringify(value) ?? 'null'
  }
  for (const entry of records) {
    const server = object(entry) && object(entry.server) ? entry.server : entry
    if (!object(server) || typeof server.name !== 'string' || !/^[a-zA-Z0-9_.\/-]+$/.test(server.name) || server.name.length > 1000 || (server.version !== undefined && (typeof server.version !== 'string' || server.version.length > 1000))) throw new Error('Invalid registry server identity')
    const identity = `${server.name}@${server.version || ''}`
    if (result.has(identity)) throw new Error(`Duplicate registry identity: ${identity}`)
    const normalized: RecordValue = {}
    for (const key of ['name', 'version', 'title', 'description', 'websiteUrl', 'repository', 'packages', 'remotes']) {
      if (server[key] !== undefined) normalized[key] = server[key]
    }
    for (const key of ['packages', 'remotes']) {
      if (normalized[key] !== undefined && !Array.isArray(normalized[key])) throw new Error(`Invalid registry ${key}`)
      if (Array.isArray(normalized[key])) normalized[key] = normalized[key].map(value => ({ value, sort: canonical(value) })).sort((a, b) => a.sort.localeCompare(b.sort)).map(item => item.value)
    }
    result.set(identity, { normalized, hash: createHash('sha256').update(canonical(server)).digest('hex') })
  }
  return { records: result, canonical }
}

export function compareRegistrySnapshots(before: unknown, after: unknown) {
  const first = snapshots(before)
  const second = snapshots(after)
  const added: string[] = []
  const removed = [...first.records.keys()].filter(identity => !second.records.has(identity))
  const changed: { identity: string; previous: RecordValue; current: RecordValue }[] = []
  const unmodeledChanges: string[] = []
  let unchangedCount = 0
  for (const [identity, current] of second.records) {
    const previous = first.records.get(identity)
    if (!previous) added.push(identity)
    else if (first.canonical(previous.normalized) !== second.canonical(current.normalized)) changed.push({ identity, previous: previous.normalized, current: current.normalized })
    else if (previous.hash !== current.hash) unmodeledChanges.push(identity)
    else unchangedCount++
  }
  return { added, removed, changed, unmodeledChanges, unchangedCount }
}
