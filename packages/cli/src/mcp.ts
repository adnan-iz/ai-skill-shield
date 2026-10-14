import { scanLocalSkillWithOptions } from './local-scan'

const tool = { name: 'scan_skill', description: 'Scan a local skill directory using AI Skill Shield security rules. Reads bounded local files; never executes skill code. Optional dependencies sends package names and versions to OSV.', inputSchema: { type: 'object', properties: { path: { type: 'string', minLength: 1, maxLength: 4096 }, dependencies: { type: 'boolean', default: false } }, required: ['path'], additionalProperties: false } }
export function runMcp(): void {
  let buffer = ''
  let initialized = false
  let ready = false
  let queue = Promise.resolve()
  let pending = 0
  const send = (value: object) => process.stdout.write(JSON.stringify(value) + '\n')
  async function handle(line: string) {
    let request: { jsonrpc?: string; id?: number | string | null; method?: string; params?: Record<string, unknown> }
    try { request = JSON.parse(line) } catch { send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); return }
    if (!request || typeof request !== 'object' || Array.isArray(request) || request.jsonrpc !== '2.0' || typeof request.method !== 'string' || (request.id !== undefined && request.id !== null && typeof request.id !== 'string' && typeof request.id !== 'number')) {
      send({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid request' } }); return
    }
    if (request.id === undefined) { if (request.method === 'notifications/initialized' && initialized) ready = true; return }
    const reply = (result: unknown) => send({ jsonrpc: '2.0', id: request.id, result })
    const error = (code: number, message: string) => send({ jsonrpc: '2.0', id: request.id, error: { code, message } })
    if (request.method === 'initialize') {
      const versions = ['2024-11-05', '2025-03-26', '2025-06-18']
      const version = request.params?.protocolVersion
      const client = request.params?.clientInfo as { name?: unknown; version?: unknown } | undefined
      const capabilities = request.params?.capabilities
      if (initialized || typeof version !== 'string' || !client || typeof client.name !== 'string' || typeof client.version !== 'string' || !capabilities || typeof capabilities !== 'object' || Array.isArray(capabilities)) { error(-32602, 'Invalid initialize parameters'); return }
      initialized = true
      reply({ protocolVersion: versions.includes(version) ? version : '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'skillshield', version: '0.3.0' } })
    } else if (request.method === 'ping') reply({})
    else if (!ready) error(-32000, 'Initialize the server first')
    else if (request.method === 'tools/list') reply({ tools: [tool] })
    else if (request.method === 'tools/call') {
      const args = request.params?.arguments as Record<string, unknown> | undefined
      if (request.params?.name !== 'scan_skill' || !args || typeof args !== 'object' || Array.isArray(args) || typeof args.path !== 'string' || !args.path.trim() || args.path.length > 4096 || (args.dependencies !== undefined && typeof args.dependencies !== 'boolean') || Object.keys(args).some(k => !['path', 'dependencies'].includes(k))) { error(-32602, 'Expected scan_skill with a local directory path'); return }
      try { reply({ content: [{ type: 'text', text: JSON.stringify(await scanLocalSkillWithOptions(args.path, args.dependencies === true)) }], isError: false }) }
      catch (e) { reply({ content: [{ type: 'text', text: e instanceof Error ? e.message : 'Scan failed' }], isError: true }) }
    } else error(-32601, 'Method not found')
  }
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (chunk: string) => {
    buffer += chunk
    if (buffer.length > 1024 * 1024) { send({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Message exceeds limit' } }); process.stdin.destroy(); return }
    let newline
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim()
      buffer = buffer.slice(newline + 1)
      if (!line) continue
      if (++pending > 32) { send({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Too many pending messages' } }); process.stdin.destroy(); break }
      queue = queue.then(() => handle(line)).finally(() => { pending-- })
    }
  })
}
