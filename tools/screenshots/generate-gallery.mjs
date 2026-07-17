/**
 * Generate Wiki gallery + README snippet from tools/screenshots/manifest.json.
 * Does not launch the app.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')
const manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8')
)

const outDir = path.resolve(
  repoRoot,
  process.env.CAPTIVATE_SCREENSHOT_OUT || manifest.outputDir || 'docs/screenshots'
)
// README/Wiki paths always point at the in-repo docs location, even when CI
// captures into a temporary output directory.
const relativeOut = (
  process.env.CAPTIVATE_SCREENSHOT_DOCS_PATH ||
  manifest.outputDir ||
  'docs/screenshots'
)
  .split(path.sep)
  .join('/')

function shotExists(shot) {
  return fs.existsSync(path.join(outDir, shot.file))
}

function wikiGallery(shots) {
  const lines = [
    '# Screenshots',
    '',
    'Generated from `tools/screenshots/manifest.json`. Images live in-repo under `' +
      relativeOut +
      '/`.',
    '',
    'Hotlink pattern:',
    '',
    '```',
    `https://raw.githubusercontent.com/NicholasTracy/captivate-2/Main/${relativeOut}/<file>.png`,
    '```',
    '',
  ]

  for (const shot of shots) {
    const missing = shotExists(shot) ? '' : ' _(image missing — run capture)_'
    lines.push(`## ${shot.title}`)
    lines.push('')
    lines.push(shot.caption || '')
    lines.push('')
    lines.push(`![${shot.title}](${shot.file})${missing}`)
    lines.push('')
  }

  return lines.join('\n').trimEnd() + '\n'
}

function readmeSnippet(shots) {
  const lines = [
    '<!-- BEGIN CAPTIVATE_SCREENSHOTS_README -->',
    '## In the app',
    '',
  ]

  for (const shot of shots) {
    lines.push(`### ${shot.title}`)
    lines.push('')
    if (shot.caption) {
      lines.push(shot.caption)
      lines.push('')
    }
    lines.push(`![${shot.title}](${relativeOut}/${shot.file})`)
    lines.push('')
  }

  lines.push('<!-- END CAPTIVATE_SCREENSHOTS_README -->')
  lines.push('')
  return lines.join('\n')
}

fs.mkdirSync(outDir, { recursive: true })

const wikiShots = (manifest.shots || []).filter((s) => s.wiki !== false)
const readmeShots = (manifest.shots || []).filter((s) => s.readme === true)

const galleryPath = path.join(outDir, 'GALLERY.md')
const snippetPath = path.join(outDir, 'README_SNIPPET.md')

fs.writeFileSync(galleryPath, wikiGallery(wikiShots), 'utf8')
fs.writeFileSync(snippetPath, readmeSnippet(readmeShots), 'utf8')

console.log(`Wrote ${path.relative(repoRoot, galleryPath)}`)
console.log(`Wrote ${path.relative(repoRoot, snippetPath)}`)
console.log(
  `Wiki shots: ${wikiShots.length}, README heroes: ${readmeShots.length}`
)
