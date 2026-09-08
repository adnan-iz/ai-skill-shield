import vm from 'node:vm'
import path from 'node:path'
import util from 'node:util'
import type { SandboxOptions, SandboxExecutionResult, SandboxViolation } from './types'

const SENSITIVE_ENV_PATTERNS = [
  /secret/i,
  /key/i,
  /token/i,
  /password|passwd|pwd/i,
  /auth/i,
  /credential/i,
  /private/i,
  /database_url/i,
  /conn_?str/i,
]

function isSensitiveEnv(varName: string): boolean {
  return SENSITIVE_ENV_PATTERNS.some((pattern) => pattern.test(varName))
}

function isPathAllowed(targetPath: string, allowedPaths?: string[]): boolean {
  if (!allowedPaths || allowedPaths.length === 0) {
    return false
  }
  const resolvedTarget = path.resolve(targetPath)
  return allowedPaths.some((allowed) => {
    const resolvedAllowed = path.resolve(allowed)
    return resolvedTarget === resolvedAllowed || resolvedTarget.startsWith(resolvedAllowed + path.sep)
  })
}

export async function executeInSandbox(
  scriptContent: string,
  options?: SandboxOptions
): Promise<SandboxExecutionResult> {
  const timeoutMs = options?.timeoutMs ?? 2000
  const memoryLimitMb = options?.memoryLimitMb ?? 64
  const allowNetwork = options?.allowNetwork ?? false
  const allowedPaths = options?.allowedPaths ?? []

  let stdout = ''
  let stderr = ''
  let timedOut = false
  let memoryExceeded = false
  let exitCode = 0

  const attemptedActions: SandboxExecutionResult['attemptedActions'] = {
    networkCalls: [],
    filesystemWrites: [],
    processSpawns: [],
    envAccesses: [],
  }

  const violations: SandboxViolation[] = []

  const recordNetwork = (url: string) => {
    if (!attemptedActions.networkCalls.includes(url)) {
      attemptedActions.networkCalls.push(url)
    }
    if (!allowNetwork) {
      violations.push({
        type: 'network',
        severity: 'high',
        description: `Unauthorized network call to ${url}`,
      })
      throw new Error(`Network access blocked: unauthorized call to ${url}`)
    }
  }

  const recordEnvAccess = (varName: string) => {
    if (!attemptedActions.envAccesses.includes(varName)) {
      attemptedActions.envAccesses.push(varName)
    }
    if (isSensitiveEnv(varName)) {
      violations.push({
        type: 'env',
        severity: 'high',
        description: `Access to sensitive environment variable: ${varName}`,
      })
    }
  }

  const recordProcessSpawn = (command: string) => {
    if (!attemptedActions.processSpawns.includes(command)) {
      attemptedActions.processSpawns.push(command)
    }
    violations.push({
      type: 'process',
      severity: 'critical',
      description: `Unauthorized process spawn attempted: ${command}`,
    })
    throw new Error(`Process spawn blocked: ${command} is not permitted in sandbox`)
  }

  const recordFsWrite = (filePath: string) => {
    if (!attemptedActions.filesystemWrites.includes(filePath)) {
      attemptedActions.filesystemWrites.push(filePath)
    }
    const allowed = isPathAllowed(filePath, allowedPaths)
    if (!allowed) {
      violations.push({
        type: 'filesystem',
        severity: 'high',
        description: `Unauthorized filesystem write/deletion to ${filePath}`,
      })
      throw new Error(`Filesystem write blocked: ${filePath} is outside allowed paths`)
    }
  }

  // Active timers tracking for cleanup
  const activeTimers = new Set<NodeJS.Timeout>()
  const safeSetTimeout = (fn: (...args: unknown[]) => void, delay?: number, ...args: unknown[]) => {
    const t = setTimeout(() => {
      activeTimers.delete(t)
      fn(...args)
    }, delay)
    activeTimers.add(t)
    return t
  }
  const safeClearTimeout = (t: NodeJS.Timeout | string | number | undefined) => {
    if (t && typeof t === 'object') {
      activeTimers.delete(t as NodeJS.Timeout)
    }
    clearTimeout(t as NodeJS.Timeout)
  }
  const safeSetInterval = (fn: (...args: unknown[]) => void, delay?: number, ...args: unknown[]) => {
    const t = setInterval(fn, delay, ...args)
    activeTimers.add(t)
    return t
  }
  const safeClearInterval = (t: NodeJS.Timeout | string | number | undefined) => {
    if (t && typeof t === 'object') {
      activeTimers.delete(t as NodeJS.Timeout)
    }
    clearInterval(t as NodeJS.Timeout)
  }

  // Mock console
  const mockConsole = {
    log: (...args: unknown[]) => {
      stdout += util.format(...args) + '\n'
    },
    info: (...args: unknown[]) => {
      stdout += util.format(...args) + '\n'
    },
    warn: (...args: unknown[]) => {
      stderr += util.format(...args) + '\n'
    },
    error: (...args: unknown[]) => {
      stderr += util.format(...args) + '\n'
    },
    dir: (...args: unknown[]) => {
      stdout += util.format(...args) + '\n'
    },
    debug: (...args: unknown[]) => {
      stdout += util.format(...args) + '\n'
    },
  }

  // Process.env Proxy
  const envTarget = Object.create(null)
  const envProxy = new Proxy(envTarget, {
    get(_target, prop) {
      if (typeof prop === 'string') {
        recordEnvAccess(prop)
      }
      return undefined
    },
    has(_target, prop) {
      if (typeof prop === 'string') {
        recordEnvAccess(prop)
      }
      return false
    },
    set(_target, prop) {
      if (typeof prop === 'string') {
        recordEnvAccess(prop)
      }
      return true
    },
    ownKeys() {
      return []
    },
    getOwnPropertyDescriptor() {
      return undefined
    },
  })

  // Mock process
  const mockProcess = {
    env: envProxy,
    cwd: () => '/sandbox',
    platform: process.platform,
    arch: process.arch,
    version: process.version,
    versions: process.versions,
    stdout: {
      write: (chunk: unknown) => {
        stdout += String(chunk)
        return true
      },
    },
    stderr: {
      write: (chunk: unknown) => {
        stderr += String(chunk)
        return true
      },
    },
    exit: (code = 0) => {
      exitCode = code
      throw new Error(`Process.exit called with code ${code}`)
    },
    nextTick: (fn: (...args: unknown[]) => void, ...args: unknown[]) => {
      queueMicrotask(() => fn(...args))
    },
  }

  // Mock fetch
  const mockFetch = (input: unknown, _init?: unknown) => {
    let urlStr: string
    if (typeof input === 'string') {
      urlStr = input
    } else if (input && typeof (input as { href?: unknown }).href === 'string') {
      urlStr = (input as { href: string }).href
    } else if (input && typeof (input as { url?: unknown }).url === 'string') {
      urlStr = (input as { url: string }).url
    } else {
      urlStr = String(input)
    }

    recordNetwork(urlStr)

    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      text: async () => '',
      json: async () => ({}),
      blob: async () => new Blob([]),
      arrayBuffer: async () => new ArrayBuffer(0),
    })
  }

  // Mock http / https
  const createMockHttp = (protocol: string) => {
    const handleRequest = (urlOrOptions: unknown, ..._rest: unknown[]) => {
      let target = ''
      if (typeof urlOrOptions === 'string') {
        target = urlOrOptions
      } else if (urlOrOptions && typeof (urlOrOptions as { href?: unknown }).href === 'string') {
        target = (urlOrOptions as { href: string }).href
      } else if (urlOrOptions && typeof urlOrOptions === 'object') {
        const opts = urlOrOptions as { host?: string; hostname?: string; path?: string }
        const host = opts.host || opts.hostname || 'localhost'
        const reqPath = opts.path || '/'
        target = `${protocol}//${host}${reqPath}`
      } else {
        target = String(urlOrOptions)
      }

      recordNetwork(target)

      return {
        on: () => {},
        once: () => {},
        emit: () => {},
        end: () => {},
        write: () => {},
        abort: () => {},
        destroy: () => {},
      }
    }

    return {
      get: handleRequest,
      request: handleRequest,
    }
  }

  const mockHttp = createMockHttp('http:')
  const mockHttps = createMockHttp('https:')

  // Mock child_process
  const mockChildProcess = new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop === 'symbol' || prop === 'then') return undefined
        return (firstArg: unknown, ..._rest: unknown[]) => {
          const cmd = firstArg != null ? (typeof firstArg === 'string' ? firstArg : JSON.stringify(firstArg)) : String(prop)
          recordProcessSpawn(cmd)
        }
      },
      apply(_target, _thisArg, args) {
        const cmd = args.length > 0 ? String(args[0]) : 'spawn'
        recordProcessSpawn(cmd)
      },
    }
  )

  // Mock fs
  const createFsWriter = () => (file: unknown, ..._args: unknown[]) => {
    const filePath = String(file)
    recordFsWrite(filePath)
  }

  const createAsyncFsWriter = () => (file: unknown, ..._args: unknown[]) => {
    const filePath = String(file)
    recordFsWrite(filePath)
    return Promise.resolve()
  }

  const mockFsPromises = {
    writeFile: createAsyncFsWriter(),
    appendFile: createAsyncFsWriter(),
    unlink: createAsyncFsWriter(),
    rm: createAsyncFsWriter(),
    rmdir: createAsyncFsWriter(),
    mkdir: createAsyncFsWriter(),
    copyFile: createAsyncFsWriter(),
    rename: createAsyncFsWriter(),
    truncate: createAsyncFsWriter(),
    chmod: createAsyncFsWriter(),
    chown: createAsyncFsWriter(),
    readFile: async () => Buffer.from(''),
    stat: async () => ({ size: 0, isFile: () => true, isDirectory: () => false }),
    readdir: async () => [],
    access: async () => {},
  }

  const mockFs = {
    writeFileSync: createFsWriter(),
    writeFile: (file: unknown, ...args: unknown[]) => {
      const filePath = String(file)
      recordFsWrite(filePath)
      const callback = args.find((a): a is (...args: unknown[]) => void => typeof a === 'function')
      if (callback) callback(null)
    },
    appendFileSync: createFsWriter(),
    appendFile: (file: unknown, ...args: unknown[]) => {
      const filePath = String(file)
      recordFsWrite(filePath)
      const callback = args.find((a): a is (...args: unknown[]) => void => typeof a === 'function')
      if (callback) callback(null)
    },
    unlinkSync: createFsWriter(),
    unlink: (file: unknown, ...args: unknown[]) => {
      const filePath = String(file)
      recordFsWrite(filePath)
      const callback = args.find((a): a is (...args: unknown[]) => void => typeof a === 'function')
      if (callback) callback(null)
    },
    rmSync: createFsWriter(),
    rm: (file: unknown, ...args: unknown[]) => {
      const filePath = String(file)
      recordFsWrite(filePath)
      const callback = args.find((a): a is (...args: unknown[]) => void => typeof a === 'function')
      if (callback) callback(null)
    },
    rmdirSync: createFsWriter(),
    rmdir: (file: unknown, ...args: unknown[]) => {
      const filePath = String(file)
      recordFsWrite(filePath)
      const callback = args.find((a): a is (...args: unknown[]) => void => typeof a === 'function')
      if (callback) callback(null)
    },
    mkdirSync: createFsWriter(),
    mkdir: (file: unknown, ...args: unknown[]) => {
      const filePath = String(file)
      recordFsWrite(filePath)
      const callback = args.find((a): a is (...args: unknown[]) => void => typeof a === 'function')
      if (callback) callback(null)
    },
    copyFileSync: createFsWriter(),
    copyFile: (file: unknown, ...args: unknown[]) => {
      const filePath = String(file)
      recordFsWrite(filePath)
      const callback = args.find((a): a is (...args: unknown[]) => void => typeof a === 'function')
      if (callback) callback(null)
    },
    renameSync: createFsWriter(),
    rename: (file: unknown, ...args: unknown[]) => {
      const filePath = String(file)
      recordFsWrite(filePath)
      const callback = args.find((a): a is (...args: unknown[]) => void => typeof a === 'function')
      if (callback) callback(null)
    },
    truncateSync: createFsWriter(),
    truncate: (file: unknown, ...args: unknown[]) => {
      const filePath = String(file)
      recordFsWrite(filePath)
      const callback = args.find((a): a is (...args: unknown[]) => void => typeof a === 'function')
      if (callback) callback(null)
    },
    chmodSync: createFsWriter(),
    chmod: (file: unknown, ...args: unknown[]) => {
      const filePath = String(file)
      recordFsWrite(filePath)
      const callback = args.find((a): a is (...args: unknown[]) => void => typeof a === 'function')
      if (callback) callback(null)
    },
    chownSync: createFsWriter(),
    chown: (file: unknown, ...args: unknown[]) => {
      const filePath = String(file)
      recordFsWrite(filePath)
      const callback = args.find((a): a is (...args: unknown[]) => void => typeof a === 'function')
      if (callback) callback(null)
    },
    createWriteStream: (file: unknown) => {
      const filePath = String(file)
      recordFsWrite(filePath)
      return {
        write: () => true,
        end: () => {},
        on: () => {},
        once: () => {},
        emit: () => {},
      }
    },
    readFileSync: () => Buffer.from(''),
    readFile: (_file: unknown, ...args: unknown[]) => {
      const callback = args.find((a): a is (...args: unknown[]) => void => typeof a === 'function')
      if (callback) callback(null, Buffer.from(''))
    },
    existsSync: () => false,
    statSync: () => ({ size: 0, isFile: () => true, isDirectory: () => false }),
    readdirSync: () => [],
    promises: mockFsPromises,
  }

  // Mock require
  const mockRequire = (moduleName: string) => {
    if (
      moduleName === 'fs' ||
      moduleName === 'node:fs'
    ) {
      return mockFs
    }
    if (
      moduleName === 'fs/promises' ||
      moduleName === 'node:fs/promises'
    ) {
      return mockFsPromises
    }
    if (
      moduleName === 'child_process' ||
      moduleName === 'node:child_process'
    ) {
      return mockChildProcess
    }
    if (
      moduleName === 'http' ||
      moduleName === 'node:http'
    ) {
      return mockHttp
    }
    if (
      moduleName === 'https' ||
      moduleName === 'node:https'
    ) {
      return mockHttps
    }
    if (
      moduleName === 'path' ||
      moduleName === 'node:path'
    ) {
      return path
    }
    if (
      moduleName === 'util' ||
      moduleName === 'node:util'
    ) {
      return util
    }
    if (
      moduleName === 'buffer' ||
      moduleName === 'node:buffer'
    ) {
      return { Buffer }
    }

    violations.push({
      type: 'process',
      severity: 'high',
      description: `Blocked attempt to require module '${moduleName}'`,
    })
    throw new Error(`Module '${moduleName}' cannot be imported in sandbox`)
  }

  // Sandbox global context
  const sandboxContext: Record<string, unknown> = {
    console: mockConsole,
    process: mockProcess,
    fetch: mockFetch,
    http: mockHttp,
    https: mockHttps,
    fs: mockFs,
    child_process: mockChildProcess,
    require: mockRequire,
    setTimeout: safeSetTimeout,
    clearTimeout: safeClearTimeout,
    setInterval: safeSetInterval,
    clearInterval: safeClearInterval,
    setImmediate: (fn: (...args: unknown[]) => void, ...args: unknown[]) => safeSetTimeout(fn, 0, ...args),
    clearImmediate: safeClearTimeout,
    Buffer,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    Headers,
    Request,
    Response,
    Math,
    Date,
    JSON,
    RegExp,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Promise,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Symbol,
    Error,
    TypeError,
    RangeError,
    SyntaxError,
    atob,
    btoa,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURI,
    encodeURIComponent,
    decodeURI,
    decodeURIComponent,
  }

  // Make global/globalThis point to the context
  sandboxContext.global = sandboxContext
  sandboxContext.globalThis = sandboxContext

  const context = vm.createContext(sandboxContext)

  const startTime = Date.now()
  let executionTimer: NodeJS.Timeout | null = null

  try {
    const wrappedCode = `(async () => {\n${scriptContent}\n})()`

    const timeoutPromise = new Promise<never>((_, reject) => {
      executionTimer = setTimeout(() => {
        const err = new Error(`Script execution timed out after ${timeoutMs}ms`) as Error & { code?: string }
        err.code = 'ERR_SCRIPT_EXECUTION_TIMEOUT'
        reject(err)
      }, timeoutMs)
    })

    const runPromise = (async () => {
      // vm.runInContext enforces synchronous execution timeout
      const rawResult = vm.runInContext(wrappedCode, context, {
        timeout: timeoutMs,
        displayErrors: true,
      })
      if (rawResult && typeof rawResult.then === 'function') {
        return await rawResult
      }
      return rawResult
    })()

    await Promise.race([runPromise, timeoutPromise])

    // Check memory limit
    const memUsageMb = process.memoryUsage().heapUsed / (1024 * 1024)
    if (memUsageMb > memoryLimitMb) {
      memoryExceeded = true
      violations.push({
        type: 'memory',
        severity: 'critical',
        description: `Memory limit exceeded: heap used ${memUsageMb.toFixed(1)}MB exceeds limit of ${memoryLimitMb}MB`,
      })
    }
  } catch (error: unknown) {
    const err = error as { code?: string; name?: string; message?: string } | null
    if (err?.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT' || err?.message?.includes('timed out')) {
      timedOut = true
      violations.push({
        type: 'timeout',
        severity: 'critical',
        description: `Script execution timed out after ${timeoutMs}ms`,
      })
      stderr += `Script execution timed out after ${timeoutMs}ms\n`
    } else if (err?.name === 'RangeError' && err?.message?.includes('allocation')) {
      memoryExceeded = true
      violations.push({
        type: 'memory',
        severity: 'critical',
        description: 'Memory allocation limit exceeded',
      })
      stderr += `${err.message}\n`
    } else if (err?.message?.startsWith('Process.exit called')) {
      // Normal process.exit handling
    } else {
      stderr += (err?.message || String(error)) + '\n'
    }

    if (exitCode === 0) {
      exitCode = 1
    }
  } finally {
    if (executionTimer) {
      clearTimeout(executionTimer)
    }
    for (const t of activeTimers) {
      clearTimeout(t)
      clearInterval(t)
    }
    activeTimers.clear()
  }

  const executionTimeMs = Math.max(0, Date.now() - startTime)
  const hasCriticalOrHighViolation = violations.some(
    (v) => v.severity === 'critical' || v.severity === 'high'
  )
  const success =
    !timedOut &&
    !memoryExceeded &&
    exitCode === 0 &&
    !hasCriticalOrHighViolation &&
    violations.length === 0

  if (!success && exitCode === 0) {
    exitCode = 1
  }

  return {
    success,
    exitCode,
    executionTimeMs,
    timedOut,
    memoryExceeded,
    stdout,
    stderr,
    attemptedActions,
    violations,
  }
}
