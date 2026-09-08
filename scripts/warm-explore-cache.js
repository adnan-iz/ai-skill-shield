#!/usr/bin/env node
const http = require('http')

const PORT = process.env.PORT || 3008
const URL = `http://127.0.0.1:${PORT}/explore`

function warm() {
  return new Promise((resolve) => {
    const req = http.get(URL, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => resolve({ status: res.statusCode, size: data.length }))
    })
    req.on('error', (e) => resolve({ error: e.message }))
    req.setTimeout(60000, () => { req.destroy(); resolve({ error: 'timeout' }) })
  })
}

async function waitForServer(retries = 30, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await warm()
      if (!result.error) {
        console.log(`[warm] Cache warmed in ${i + 1} attempt(s): ${result.status} ${result.size}b`)
        return true
      }
    } catch {}
    await new Promise(r => setTimeout(r, delay))
  }
  console.log('[warm] Failed to warm cache after retries')
  return false
}

waitForServer()
