/**
 * Create placeholder PNGs for any manifest shot whose file is missing.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')
const manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8')
)
const outDir = path.resolve(repoRoot, manifest.outputDir || 'docs/screenshots')
const maker = path.join(__dirname, 'create-placeholder-png.mjs')

fs.mkdirSync(outDir, { recursive: true })

let created = 0
for (const shot of manifest.shots || []) {
  const filePath = path.join(outDir, shot.file)
  if (fs.existsSync(filePath)) continue
  const label = shot.title || shot.id
  const result = spawnSync(
    process.execPath,
    [maker, filePath, label],
    { encoding: 'utf8' }
  )
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout)
    process.exit(result.status || 1)
  }
  created += 1
}

console.log(
  created === 0
    ? 'All manifest screenshots already exist.'
    : `Created ${created} placeholder(s) in ${path.relative(repoRoot, outDir)}`
)
