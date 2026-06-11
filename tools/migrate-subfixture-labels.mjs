/**
 * Patches fixture library JSON (array or { fixtures: [] }) so subfixture group/name
 * strings that used legacy ASCII past "z" are renamed to aa, ab, …
 *
 * Usage: node tools/migrate-subfixture-labels.mjs [path/to/file.db ...]
 * Default: assets/captivate_fixtures.db
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function subFixtureLabel(index) {
  if (!Number.isFinite(index) || index < 0) return 'a'
  let i = Math.floor(index)
  let result = ''
  do {
    result = String.fromCharCode(97 + (i % 26)) + result
    i = Math.floor(i / 26) - 1
  } while (i >= 0)
  return result
}

function legacySubFixtureLabel(index) {
  if (!Number.isFinite(index) || index < 0) return 'a'
  return String.fromCharCode(Math.floor(index) + 97)
}

const REMAP = new Map()
for (let i = 0; i < 256; i++) {
  const legacy = legacySubFixtureLabel(i)
  const modern = subFixtureLabel(i)
  if (legacy !== modern) REMAP.set(legacy, modern)
}

function remapGroups(groups) {
  if (!Array.isArray(groups)) return groups
  return groups.map((g) => (typeof g === 'string' ? REMAP.get(g) ?? g : g))
}

function migrateFixtureType(ft) {
  let changed = 0
  if (!ft || typeof ft !== 'object') return changed

  if (Array.isArray(ft.groups)) {
    const next = remapGroups(ft.groups)
    if (JSON.stringify(next) !== JSON.stringify(ft.groups)) {
      ft.groups = next
      changed++
    }
  }

  if (!Array.isArray(ft.subFixtures)) return changed

  for (const sub of ft.subFixtures) {
    if (!sub || typeof sub !== 'object') continue
    if (Array.isArray(sub.groups)) {
      const next = remapGroups(sub.groups)
      if (JSON.stringify(next) !== JSON.stringify(sub.groups)) {
        sub.groups = next
        changed++
      }
    }
    if (typeof sub.name === 'string' && REMAP.has(sub.name)) {
      sub.name = REMAP.get(sub.name)
      changed++
    }
  }
  return changed
}

function loadPayload(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  const parsed = JSON.parse(raw)
  if (Array.isArray(parsed)) {
    return { kind: 'array', data: parsed }
  }
  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.fixtures)) {
    return { kind: 'library', data: parsed }
  }
  throw new Error(`Unsupported fixture file shape: ${filePath}`)
}

function writePayload(filePath, payload) {
  const out =
    payload.kind === 'library'
      ? JSON.stringify(payload.data)
      : JSON.stringify(payload.data)
  fs.writeFileSync(filePath, out, 'utf8')
}

function migrateFile(filePath) {
  const payload = loadPayload(filePath)
  const fixtures =
    payload.kind === 'library' ? payload.data.fixtures : payload.data
  let total = 0
  for (const ft of fixtures) {
    total += migrateFixtureType(ft)
  }
  if (total > 0) {
    writePayload(filePath, payload)
  }
  console.log(
    `${path.relative(repoRoot, filePath)}: ${fixtures.length} fixtures, ${total} field update(s)`
  )
}

const args = process.argv.slice(2)
const files =
  args.length > 0
    ? args.map((p) => path.resolve(p))
    : [path.join(repoRoot, 'assets', 'captivate_fixtures.db')]

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.error(`Missing: ${file}`)
    process.exitCode = 1
    continue
  }
  migrateFile(file)
}

// Sanity check labels
for (const [i, expected] of [
  [0, 'a'],
  [25, 'z'],
  [26, 'aa'],
  [27, 'ab'],
  [51, 'az'],
  [52, 'ba'],
]) {
  const got = subFixtureLabel(i)
  if (got !== expected) {
    console.error(`Label check failed: ${i} -> ${got}, expected ${expected}`)
    process.exitCode = 1
  }
}
