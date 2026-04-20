/**
 * Re-invokes a command with a Node install that satisfies `.node-version` / `engines.node`
 * when the current `node` is too old (e.g. Cursor Agent shell vs integrated terminal).
 *
 * Usage: node tools/run-with-qualified-node.cjs -- <argv...>
 * Example: node tools/run-with-qualified-node.cjs -- npm run package:bundle:inner
 */
/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const repoRoot = path.join(__dirname, '..')

function readText(p) {
  try {
    return fs.readFileSync(p, 'utf8')
  } catch {
    return ''
  }
}

function parseMinFromEngines() {
  const raw = readText(path.join(repoRoot, 'package.json'))
  const m = raw.match(/"node"\s*:\s*">=\s*(\d+)\.(\d+)\.(\d+)"/)
  if (!m) return [25, 9, 0]
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

function parseMinFromDotfile() {
  const raw = readText(path.join(repoRoot, '.node-version'))
  const line = (raw.split(/\r?\n/)[0] || '').replace(/#.*/, '').trim().replace(/^v/, '')
  const m = line.match(/^(\d+)\.(\d+)\.(\d+)/)
  if (!m) return null
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

function parseProcessVersion() {
  const m = String(process.version).match(/^v(\d+)\.(\d+)\.(\d+)/)
  if (!m) return null
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

function compareSemver(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return 1
    if (a[i] < b[i]) return -1
  }
  return 0
}

function versionFromNodeExe(nodeExe) {
  const r = spawnSync(nodeExe, ['-p', 'process.version.slice(1)'], {
    encoding: 'utf8',
    windowsHide: true,
  })
  if (r.status !== 0 || !r.stdout) return null
  const m = String(r.stdout).trim().match(/^(\d+)\.(\d+)\.(\d+)/)
  if (!m) return null
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

function testNodeDir(dir, minVer) {
  if (!dir || typeof dir !== 'string') return null
  const exe = path.join(dir, process.platform === 'win32' ? 'node.exe' : 'node')
  if (!fs.existsSync(exe)) return null
  const v = versionFromNodeExe(exe)
  if (!v || compareSemver(v, minVer) < 0) return null
  return { dir, exe, version: v }
}

function collectWindowsCandidates(minVer) {
  const hits = []
  const add = (dir) => {
    const t = testNodeDir(dir, minVer)
    if (t) hits.push(t)
  }

  if (process.env.CAPTIVATE_NODE_BIN) {
    add(process.env.CAPTIVATE_NODE_BIN)
  }
  add(path.join(process.env.ProgramFiles || '', 'nodejs'))
  add(path.join(process.env['ProgramFiles(x86)'] || '', 'nodejs'))

  const wingetRoot = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages')
  if (fs.existsSync(wingetRoot)) {
    try {
      for (const pkg of fs.readdirSync(wingetRoot, { withFileTypes: true })) {
        if (!pkg.isDirectory() || !pkg.name.includes('OpenJS.NodeJS')) continue
        const pkgPath = path.join(wingetRoot, pkg.name)
        for (const sub of fs.readdirSync(pkgPath, { withFileTypes: true })) {
          if (!sub.isDirectory() || !sub.name.includes('node-') || !sub.name.includes('win-x64'))
            continue
          add(path.join(pkgPath, sub.name))
        }
      }
    } catch {
      // ignore
    }
  }

  for (const sym of [process.env.NVM_SYMLINK, process.env.NVM4W_SYMLINK]) {
    if (sym) add(sym)
  }

  return hits
}

function pickBest(hits) {
  if (!hits.length) return null
  return hits.sort((a, b) => compareSemver(a.version, b.version))[hits.length - 1]
}

function main() {
  const dash = process.argv.indexOf('--')
  if (dash < 0 || dash === process.argv.length - 1) {
    console.error(
      '[captivate] Usage: node tools/run-with-qualified-node.cjs -- <command> [args...]'
    )
    process.exit(1)
  }

  const minFromFile = parseMinFromDotfile()
  const minFromPkg = parseMinFromEngines()
  const minVer =
    minFromFile === null
      ? minFromPkg
      : compareSemver(minFromFile, minFromPkg) >= 0
        ? minFromFile
        : minFromPkg

  const cur = parseProcessVersion()
  const ok = cur && compareSemver(cur, minVer) >= 0

  let childEnv = { ...process.env }

  if (!ok) {
    if (process.platform !== 'win32') {
      console.error(
        `[captivate] Node ${process.version} does not satisfy ${minVer.join('.')}+. Install Node ${minVer.join('.')}+ or run from a shell with that Node on PATH.`
      )
      process.exit(1)
    }
    const hits = collectWindowsCandidates(minVer)
    const best = pickBest(hits)
    if (!best) {
      console.error(
        `[captivate] Node ${process.version} is too old and no Node ${minVer.join('.')}+ install was found.`
      )
      console.error(
        '[captivate] Install Node (see .node-version), set CAPTIVATE_NODE_BIN to the folder containing node.exe, or use scripts/cursor-terminal-init.ps1 in an integrated terminal.'
      )
      process.exit(1)
    }
    childEnv.PATH = `${best.dir};${childEnv.PATH || ''}`
    console.log(
      `[captivate] Using Node ${best.version.join('.')} from ${best.dir} (was ${process.version}).`
    )
  }

  const cmd = process.argv.slice(dash + 1)
  let proc = cmd[0]
  const args = cmd.slice(1)
  if (process.platform === 'win32' && proc === 'npm') {
    proc = 'npm.cmd'
  }

  const r = spawnSync(proc, args, {
    stdio: 'inherit',
    cwd: repoRoot,
    env: childEnv,
    // npm.cmd is a batch wrapper; invoking via cmd avoids spawn edge cases on some Windows setups.
    shell: process.platform === 'win32' && /\.cmd$/i.test(proc),
  })
  process.exit(r.status === null ? 1 : r.status)
}

main()
