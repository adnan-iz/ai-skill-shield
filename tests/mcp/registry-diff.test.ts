import { expect, it } from 'vitest'
import { compareRegistrySnapshots } from '@/lib/mcp/registry-diff'

it('detects changed endpoints, additions, and same-record unmodeled changes', () => {
  const before = { servers: [{ server: { name: 'acme/tool', version: '1', remotes: [{ type: 'sse', url: 'https://old.example' }], custom: 'old' } }] }
  const after = { servers: [{ server: { name: 'acme/tool', version: '1', remotes: [{ type: 'sse', url: 'https://new.example' }], custom: 'old' } }, { server: { name: 'acme/new', version: '2' } }] }
  const diff = compareRegistrySnapshots(before, after)
  expect(diff.changed).toHaveLength(1)
  expect(diff.added).toEqual(['acme/new@2'])
  expect(compareRegistrySnapshots(before, { servers: [{ server: { ...before.servers[0].server, custom: 'new' } }] }).unmodeledChanges).toEqual(['acme/tool@1'])
})

it('ignores object key and endpoint ordering, but rejects duplicate identities', () => {
  const remotes = [{ type: 'sse', url: 'https://a.example' }, { type: 'sse', url: 'https://b.example' }]
  const server = { name: 'acme/tool', version: '1', remotes }
  expect(compareRegistrySnapshots([server], [{ version: '1', name: 'acme/tool', remotes: [...remotes].reverse() }]).changed).toEqual([])
  expect(() => compareRegistrySnapshots([server, server], [])).toThrow('Duplicate')
  expect(() => compareRegistrySnapshots([{ name: 123 }], [])).toThrow('Invalid')
})
