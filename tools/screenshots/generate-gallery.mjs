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

const BEGIN = '<!-- BEGIN CAPTIVATE_SCREENSHOTS_README -->'
const END = '<!-- END CAPTIVATE_SCREENSHOTS_README -->'

function shotExists(shot) {
  return fs.existsSync(path.join(outDir, shot.file))
}

function wikiGallery(shots) {
  const lines = [
    '# Screenshots',
    '',
    'Generated from the Captivate release screenshot review pack.',
    '',
    `Images are stored in-repo under [\`${relativeOut}/\`](https://github.com/NicholasTracy/captivate-2/tree/Main/${relativeOut}).`,
    '',
  ]

  for (const shot of shots) {
    const missing = shotExists(shot) ? '' : ' _(image missing — run capture)_'
    const rawUrl = `https://raw.githubusercontent.com/NicholasTracy/captivate-2/Main/${relativeOut}/${shot.file}`
    lines.push(`## ${shot.title}`)
    lines.push('')
    if (shot.caption) {
      lines.push(shot.caption)
      lines.push('')
    }
    // Wiki pages are outside the repo tree — hotlink raw.githubusercontent.com.
    lines.push(`![${shot.title}](${rawUrl})${missing}`)
    lines.push('')
  }

  return lines.join('\n').trimEnd() + '\n'
}

/** HTML block matching README “In the app” layout (centered figures). */
function readmeSnippet(shots) {
  const lines = [BEGIN, '## In the app', '']

  for (const shot of shots) {
    const caption = shot.caption || shot.title
    lines.push('<p align="center">')
    lines.push(
      `  <img src="${relativeOut}/${shot.file}" alt="${shot.title}" width="720" /><br />`
    )
    lines.push(`  <em>${caption}</em>`)
    lines.push('</p>')
    lines.push('')
  }

  lines.push(
    'More walkthroughs: **[Wiki](https://github.com/NicholasTracy/captivate-2/wiki)**.'
  )
  lines.push('')
  lines.push(END)
  lines.push('')
  return lines.join('\n')
}

export function patchReadmeSection(readmeText, snippet) {
  const begin = readmeText.indexOf(BEGIN)
  const end = readmeText.indexOf(END)
  if (begin === -1 || end === -1 || end < begin) {
    // Insert before Documentation section, or append.
    const docHeading = readmeText.indexOf('\n## Documentation')
    if (docHeading !== -1) {
      return (
        readmeText.slice(0, docHeading + 1) +
        snippet.trimEnd() +
        '\n' +
        readmeText.slice(docHeading + 1)
      )
    }
    return readmeText.trimEnd() + '\n\n' + snippet
  }
  return (
    readmeText.slice(0, begin) +
    snippet.trimEnd() +
    '\n' +
    readmeText.slice(end + END.length).replace(/^\r?\n/, '')
  )
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
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
}
