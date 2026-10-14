import type { Finding, Severity, SkillFile } from '@/lib/validator/types'

type Dependency = { name: string; ecosystem: 'npm' | 'PyPI'; version: string; filePath: string; lineNumber: number }
type Advisory = { id: string; summary?: string; database_specific?: { severity?: string }; affected?: { package?: { name?: string; ecosystem?: string }; ranges?: { events?: { fixed?: string }[] }[] }[] }
const cache = new Map<string, { expires: number; advisories: Advisory[] }>()
const MAX_PACKAGES = 200
const MAX_ADVISORIES = 100
const keyOf = (dep: Dependency) => `${dep.ecosystem}:${dep.name}@${dep.version}`
const exactNpm = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/
const exactPython = /^\d+(?:\.\d+)*(?:(?:a|b|rc)\d+)?(?:\.post\d+)?(?:\.dev\d+)?(?:\+[a-zA-Z0-9.]+)?$/

export async function scanDependencyAdvisories(files: SkillFile[]): Promise<{ findings: Finding[]; status: 'complete' | 'unavailable'; checkedPackages: number }> {
  const dependencies: Dependency[] = []
  let status: 'complete' | 'unavailable' = 'complete'
  const manifests = files.filter(file => /(?:^|\/)(?:package(?:-lock)?\.json|requirements(?:[-\w.]*)\.txt|pyproject\.toml)$/.test(file.path.replace(/\\/g, '/')))
  if (manifests.length > 100) status = 'unavailable'
  for (const file of manifests.slice(0, 100)) {
    if (file.content.length > 1_048_576) { status = 'unavailable'; continue }
    const add = (name: string, version: unknown, ecosystem: Dependency['ecosystem'], needle: string) => {
      if (dependencies.length >= 2000) { status = 'unavailable'; return }
      if (typeof version !== 'string' || !(ecosystem === 'npm' ? exactNpm : exactPython).test(version)) return
      if (!(ecosystem === 'npm' ? /^(?:@[a-zA-Z0-9._-]+\/)?[a-zA-Z0-9._-]+$/ : /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/).test(name)) return
      const normalized = ecosystem === 'PyPI' ? name.toLowerCase().replace(/[-_.]+/g, '-') : name
      const offset = file.content.indexOf(needle)
      dependencies.push({ name: normalized, version, ecosystem, filePath: file.path, lineNumber: offset < 0 ? 1 : file.content.slice(0, offset).split('\n').length })
    }
    try {
      if (/\.json$/.test(file.path)) {
        const data = JSON.parse(file.content)
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid manifest')
        if (file.path.endsWith('package-lock.json')) {
          if (data.packages !== undefined && (!data.packages || typeof data.packages !== 'object' || Array.isArray(data.packages))) throw new Error('Invalid lockfile packages')
          if (data.packages && typeof data.packages === 'object') {
            for (const [path, entry] of Object.entries(data.packages)) {
              const name = path.split('node_modules/').at(-1)
              if (name && path.includes('node_modules/') && entry && typeof entry === 'object') {
                const value = entry as { name?: unknown; version?: unknown }
                add(typeof value.name === 'string' ? value.name : name, value.version, 'npm', JSON.stringify(path))
              }
            }
          } else {
            const walk = (entries: Record<string, unknown>, depth: number) => {
              if (depth > 20) { status = 'unavailable'; return }
              for (const [name, entry] of Object.entries(entries)) {
                if (!entry || typeof entry !== 'object') continue
                const value = entry as { version?: unknown; dependencies?: Record<string, unknown> }
                add(name, value.version, 'npm', JSON.stringify(name))
                if (value.dependencies && typeof value.dependencies === 'object') walk(value.dependencies, depth + 1)
              }
            }
            if (data.dependencies !== undefined && (!data.dependencies || typeof data.dependencies !== 'object' || Array.isArray(data.dependencies))) throw new Error('Invalid lockfile dependencies')
            if (data.dependencies) walk(data.dependencies, 0)
          }
        } else {
          for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
            if (data[section] !== undefined && (!data[section] || typeof data[section] !== 'object' || Array.isArray(data[section]))) throw new Error('Invalid dependency manifest')
            if (data[section] && typeof data[section] === 'object') for (const [name, version] of Object.entries(data[section])) add(name, version, 'npm', JSON.stringify(name))
          }
        }
      } else if (file.path.endsWith('pyproject.toml')) {
        // shortcut: read only PEP 621 project dependency arrays; add a TOML parser when broader formats are required.
        const project = file.content.replace(/#.*$/gm, '').match(/^\[project\]\s*\n([\s\S]*?)(?=^\[|$(?![\s\S]))/m)?.[1] ?? ''
        const array = project.match(/^dependencies\s*=\s*\[((?:"[^"\n]*"|'[^'\n]*'|[^\]"'])*)\]/m)?.[1] ?? ''
        for (const match of array.matchAll(/["']([a-zA-Z0-9][a-zA-Z0-9._-]*)(?:\[[\w, -]+\])?\s*==\s*([^"';\s]+)(?:\s*;[^"']*)?["']/g)) add(match[1], match[2], 'PyPI', match[0])
      } else {
        for (const line of file.content.split('\n')) {
          const match = line.match(/^\s*([a-zA-Z0-9][a-zA-Z0-9._-]*)(?:\[[\w, -]+\])?\s*==\s*([^\s;#]+)(?:\s*(?:;|#|--hash=).*)?\s*$/)
          if (match) add(match[1], match[2], 'PyPI', line)
        }
      }
    } catch { status = 'unavailable' }
  }
  const unique = [...new Map(dependencies.map(dep => [keyOf(dep), dep])).values()]
  if (unique.length > MAX_PACKAGES) status = 'unavailable'
  const selected = unique.slice(0, MAX_PACKAGES)
  const found = new Map<string, Advisory[]>()
  const pending = selected.filter(dep => {
    const cached = cache.get(keyOf(dep))
    if (cached && cached.expires > Date.now()) { found.set(keyOf(dep), cached.advisories); return false }
    cache.delete(keyOf(dep))
    return true
  })
  if (pending.length) {
    const signal = AbortSignal.timeout(10_000)
    const request = async (url: string, init?: RequestInit) => {
      const response = await fetch(url, { ...init, signal, cache: 'no-store' })
      if (!response.ok) throw new Error('OSV unavailable')
      const reader = response.body?.getReader()
      if (!reader) throw new Error('Empty OSV response')
      const chunks: Uint8Array[] = []
      let size = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > 2_097_152) { await reader.cancel(); throw new Error('OSV response too large') }
        chunks.push(value)
      }
      return JSON.parse(Buffer.concat(chunks).toString('utf8'))
    }
    try {
      const batch = await request('https://api.osv.dev/v1/querybatch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queries: pending.map(dep => ({ package: { name: dep.name, ecosystem: dep.ecosystem }, version: dep.version })) }) })
      if (!Array.isArray(batch.results) || batch.results.length !== pending.length) throw new Error('Invalid OSV results')
      const details = new Map<string, Advisory>()
      for (let index = 0; index < pending.length; index++) {
        const result = batch.results[index]
        if (!result || typeof result !== 'object' || result.error || result.next_page_token || (result.vulns !== undefined && !Array.isArray(result.vulns))) { status = 'unavailable'; continue }
        const advisories: Advisory[] = []
        let complete = true
        for (const vuln of result.vulns ?? []) {
          if (typeof vuln?.id !== 'string' || !/^[\w.-]{1,200}$/.test(vuln.id)) { complete = false; break }
          let advisory = details.get(vuln.id)
          if (!advisory) {
            if (details.size >= MAX_ADVISORIES) { complete = false; break }
            try {
              advisory = await request(`https://api.osv.dev/v1/vulns/${encodeURIComponent(vuln.id)}`)
              if (!advisory || advisory.id !== vuln.id || (advisory.summary !== undefined && typeof advisory.summary !== 'string') || (advisory.database_specific?.severity !== undefined && typeof advisory.database_specific.severity !== 'string') || (advisory.affected !== undefined && !Array.isArray(advisory.affected))) throw new Error('Invalid advisory')
              for (const affected of advisory.affected ?? []) {
                if (!affected || (affected.ranges !== undefined && !Array.isArray(affected.ranges))) throw new Error('Invalid advisory ranges')
                for (const range of affected.ranges ?? []) {
                  if (!range || (range.events !== undefined && !Array.isArray(range.events))) throw new Error('Invalid advisory events')
                  if ((range.events ?? []).some(event => !event || (event.fixed !== undefined && typeof event.fixed !== 'string'))) throw new Error('Invalid fixed version')
                }
              }
              details.set(vuln.id, advisory)
            } catch { complete = false; break }
          }
          advisories.push(advisory)
        }
        found.set(keyOf(pending[index]), advisories)
        if (!complete) { status = 'unavailable'; continue }
        if (cache.size >= 1000) cache.delete(cache.keys().next().value!)
        cache.set(keyOf(pending[index]), { expires: Date.now() + 3_600_000, advisories })
      }
    } catch { status = 'unavailable' }
  }
  const findings: Finding[] = []
  const locations = new Set<string>()
  for (const dep of dependencies) {
    for (const advisory of found.get(keyOf(dep)) ?? []) {
      const location = `${keyOf(dep)}:${dep.filePath}:${advisory.id}`
      if (locations.has(location)) continue
      locations.add(location)
      const severity = advisory.database_specific?.severity?.toLowerCase()
      const fixes = [...new Set((advisory.affected ?? []).filter(item => item.package?.name === dep.name && item.package?.ecosystem === dep.ecosystem).flatMap(item => item.ranges ?? []).flatMap(range => range.events ?? []).map(event => event.fixed).filter((fixed): fixed is string => typeof fixed === 'string'))]
      findings.push({ id: `osv-${findings.length + 1}`, axis: 'dependencies', category: 'security', severity: (['critical', 'high', 'medium', 'low'].includes(severity ?? '') ? severity : 'medium') as Severity, title: `Vulnerable dependency: ${dep.name}@${dep.version}`, message: `${advisory.id}: ${advisory.summary ?? 'OSV reports this exact package version as affected.'}`, filePath: dep.filePath, lineNumber: dep.lineNumber, ruleId: 'dependency-vulnerability', recommendation: fixes.length ? `Review advisory https://osv.dev/vulnerability/${advisory.id}. Reported fixed versions: ${fixes.join(', ')}; choose a compatible fixed release.` : `Review https://osv.dev/vulnerability/${advisory.id} for mitigation; no fixed version is reported.` })
    }
  }
  return { findings, status, checkedPackages: found.size }
}
