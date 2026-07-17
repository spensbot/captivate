/**
 * Publish docs/screenshots into the GitHub Wiki repo.
 *
 * Wiki topic pages reference local files like `Captivate_DMX_Mixer.png`, so we
 * must copy PNGs into the wiki root (not only write a gallery markdown page).
 *
 * Usage (CI):
 *   node tools/screenshots/publish-wiki.mjs --wiki-dir /tmp/captivate-wiki
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')
const docsDir = path.join(repoRoot, 'docs/screenshots')
const manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8')
)

function argValue(flag) {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return null
  return process.argv[idx + 1] || null
}

const wikiDir = path.resolve(argValue('--wiki-dir') || '')
if (!wikiDir || !fs.existsSync(wikiDir)) {
  console.error('Usage: node tools/screenshots/publish-wiki.mjs --wiki-dir <cloned-wiki>')
  process.exit(1)
}

if (!fs.existsSync(docsDir)) {
  console.error(`Missing ${docsDir}`)
  process.exit(1)
}

const pngs = fs
  .readdirSync(docsDir)
  .filter((name) => name.toLowerCase().endsWith('.png'))

if (pngs.length === 0) {
  console.error(`No PNGs in ${docsDir}`)
  process.exit(1)
}

let copied = 0
for (const name of pngs) {
  fs.copyFileSync(path.join(docsDir, name), path.join(wikiDir, name))
  copied += 1
  console.log(`Wiki PNG: ${name}`)
}

const wikiShots = (manifest.shots || []).filter((s) => s.wiki !== false)
const lines = [
  '# Screenshots',
  '',
  'Auto-published from the Captivate repo (`docs/screenshots`) when a screenshot review PR is merged.',
  '',
]

for (const shot of wikiShots) {
  const localPath = path.join(wikiDir, shot.file)
  const missing = fs.existsSync(localPath) ? '' : ' _(image missing)_'
  lines.push(`## ${shot.title}`)
  lines.push('')
  if (shot.caption) {
    lines.push(shot.caption)
    lines.push('')
  }
  // Relative path — wiki pages and this gallery share the wiki repo root.
  lines.push(`![${shot.title}](${shot.file})${missing}`)
  lines.push('')
}

fs.writeFileSync(path.join(wikiDir, 'Screenshots.md'), lines.join('\n').trimEnd() + '\n', 'utf8')
console.log(`Wrote Screenshots.md (${wikiShots.length} shots, ${copied} PNGs)`)

const status = spawnSync('git', ['status', '--porcelain'], {
  cwd: wikiDir,
  encoding: 'utf8',
})
if (status.status !== 0) {
  console.error(status.stderr || status.stdout)
  process.exit(status.status || 1)
}

const dirty = (status.stdout || '').trim()
if (!dirty) {
  console.log('Wiki already up to date (no PNG/markdown changes).')
  process.exit(0)
}

console.log('Pending wiki changes:')
console.log(dirty)
