#!/usr/bin/env node
import { runCommand } from './command'
runCommand(process.argv.slice(2)).catch(error => { console.error(error instanceof Error ? error.message : 'Scan failed'); process.exitCode = 1 })
