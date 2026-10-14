import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const common = { bundle: true, platform: 'node', target: 'node20', alias: { '@': root }, legalComments: 'none' }
await build({ ...common, entryPoints: [path.join(root, 'packages/cli/src/index.ts')], outfile: path.join(root, 'packages/cli/dist/index.js'), format: 'esm', banner: { js: "/* eslint-disable */\nimport { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" } })
await build({ ...common, entryPoints: [path.join(root, '.github/actions/validate-skill/src/index.ts')], outfile: path.join(root, '.github/actions/validate-skill/index.js'), format: 'cjs', banner: { js: '/* eslint-disable */' } })
