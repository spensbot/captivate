/**
 * Apply a screenshot review pack into docs/screenshots + README.
 *
 * Usage:
 *   node tools/screenshots/apply-review.mjs --from path/to/review-dir
 *
 * Copies PNGs, regenerates GALLERY.md / README_SNIPPET.md, and patches README.md
 * between the CAPTIVATE_SCREENSHOTS_README markers.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')

function argValue(flag) {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return null
  return process.argv[idx + 1] || null
}

const fromDir = path.resolve(
  argValue('--from') || path.join(repoRoot, 'docs/screenshots')
)
const docsDir = path.join(repoRoot, 'docs/screenshots')
const readmePath = path.join(repoRoot, 'README.md')

if (!fs.existsSync(fromDir)) {
  console.error(`Review pack not found: ${fromDir}`)
  process.exit(1)
}

fs.mkdirSync(docsDir, { recursive: true })

const pngs = fs
  .readdirSync(fromDir)
  .filter((name) => name.toLowerCase().endsWith('.png'))

if (pngs.length === 0) {
  console.error(`No PNG files in ${fromDir}`)
  process.exit(1)
}

for (const name of pngs) {
  fs.copyFileSync(path.join(fromDir, name), path.join(docsDir, name))
  console.log(`Copied ${name}`)
}

// Prefer pack-provided gallery/snippet; otherwise regenerate from manifest.
for (const name of ['GALLERY.md', 'README_SNIPPET.md', 'REVIEW.md']) {
  const src = path.join(fromDir, name)
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(docsDir, name))
    console.log(`Copied ${name}`)
  }
}

const gallery = spawnSync(
  process.execPath,
  [path.join(__dirname, 'generate-gallery.mjs')],
  {
    cwd: repoRoot,
    env: { ...process.env, CAPTIVATE_SCREENSHOT_OUT: 'docs/screenshots' },
    encoding: 'utf8',
  }
)
if (gallery.status !== 0) {
  console.error(gallery.stdout || '')
  console.error(gallery.stderr || '')
  process.exit(gallery.status || 1)
}
process.stdout.write(gallery.stdout || '')

const { patchReadmeSection } = await import(
  pathToFileURL(path.join(__dirname, 'generate-gallery.mjs')).href
)
const snippet = fs.readFileSync(
  path.join(docsDir, 'README_SNIPPET.md'),
  'utf8'
)
const readme = fs.readFileSync(readmePath, 'utf8')
const next = patchReadmeSection(readme, snippet)
fs.writeFileSync(readmePath, next, 'utf8')
console.log('Patched README.md screenshot section')
