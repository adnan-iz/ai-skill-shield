/* eslint-disable @typescript-eslint/no-require-imports -- Next's lint plugin loads this adapter with require(). */
const { isAbsolute, parse } = require('node:path')
const { globSync } = require('tinyglobby')

// shortcut: only Next's getRootDirs call uses this scoped override; recheck when upgrading its lint plugin.
exports.globSync = (pattern, options) => globSync(pattern, {
  ...options,
  absolute: isAbsolute(pattern),
}).map(directory => directory === parse(directory).root ? directory : directory.replace(/\/$/, ''))
