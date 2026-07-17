/**
 * Capture Captivate UI screenshots via Playwright + Electron.
 *
 * Requires a packaged unpacked app (or CAPTIVATE_SCREENSHOT_APP) and
 * CAPTIVATE_SCREENSHOT=1 harness in the renderer (see docs/SCREENSHOTS.md).
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')

const manifestPath = path.join(__dirname, 'manifest.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

const outDir = path.resolve(
  repoRoot,
  process.env.CAPTIVATE_SCREENSHOT_OUT || manifest.outputDir || 'docs/screenshots'
)
const settleMs = Number(
  process.env.CAPTIVATE_SCREENSHOT_SETTLE_MS || manifest.settleMs || 700
)
const only = new Set(
  (process.env.CAPTIVATE_SCREENSHOT_ONLY || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
)

function resolveLaunch() {
  const fromEnv = process.env.CAPTIVATE_SCREENSHOT_APP?.trim()
  if (fromEnv) {
    if (!fs.existsSync(fromEnv)) {
      throw new Error(`CAPTIVATE_SCREENSHOT_APP not found: ${fromEnv}`)
    }
    return { executablePath: fromEnv, args: [] }
  }

  const packagedCandidates = [
    path.join(repoRoot, 'release/build/win-unpacked/Captivate 2.exe'),
    path.join(repoRoot, 'release/build/linux-unpacked/captivate-2'),
    path.join(repoRoot, 'release/build/linux-unpacked/Captivate 2'),
    path.join(
      repoRoot,
      'release/build/mac/Captivate 2.app/Contents/MacOS/Captivate 2'
    ),
    path.join(
      repoRoot,
      'release/build/mac-arm64/Captivate 2.app/Contents/MacOS/Captivate 2'
    ),
    path.join(
      repoRoot,
      'release/build/mac-x64/Captivate 2.app/Contents/MacOS/Captivate 2'
    ),
  ]

  for (const candidate of packagedCandidates) {
    if (fs.existsSync(candidate)) {
      return { executablePath: candidate, args: [] }
    }
  }

  // Local smoke-test: Electron + built release/app (no installer needed).
  const electronExe = path.join(
    repoRoot,
    'node_modules',
    'electron',
    'dist',
    process.platform === 'win32'
      ? 'electron.exe'
      : process.platform === 'darwin'
        ? 'Electron.app/Contents/MacOS/Electron'
        : 'electron'
  )
  const mainJs = path.join(repoRoot, 'release/app/dist/main/main.js')
  if (fs.existsSync(electronExe) && fs.existsSync(mainJs)) {
    console.log(
      'No packaged app found; using local Electron + release/app (smoke-test mode).'
    )
    return {
      executablePath: electronExe,
      args: ['.'],
      cwd: repoRoot,
      envExtras: { NODE_ENV: 'production' },
    }
  }

  throw new Error(
    [
      'No Captivate binary found.',
      'Run npm run build (smoke test) or npm run package:win,',
      'or set CAPTIVATE_SCREENSHOT_APP.',
    ].join(' ')
  )
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForHarness(page, timeoutMs = 60000) {
  await page.waitForFunction(
    () =>
      typeof window.__captivateScreenshot === 'object' &&
      window.__captivateScreenshot?.ready === true,
    null,
    { timeout: timeoutMs }
  )
}

async function findWindowByPage(app, pageName, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const windows = app.windows()
    for (const win of windows) {
      try {
        const url = win.url()
        if (url.includes(`page=${pageName}`)) {
          return win
        }
      } catch {
        // window may be closing
      }
    }
    await sleep(200)
  }
  return null
}

async function captureShot(app, mainWindow, shot) {
  const targetPath = path.join(outDir, shot.file)
  console.log(`→ ${shot.id}: ${shot.file}`)

  await mainWindow.evaluate(async (spec) => {
    const api = window.__captivateScreenshot
    if (!api) throw new Error('Screenshot harness missing')
    await api.closeOverlays()
    if (spec.page) {
      await api.setPage(spec.page)
    }
  }, { page: shot.page })

  await sleep(settleMs)

  if (shot.overlay) {
    await mainWindow.evaluate(async (overlay) => {
      await window.__captivateScreenshot.setOverlay(overlay)
    }, shot.overlay)
    await sleep(settleMs)
    await mainWindow.screenshot({ path: targetPath })
    await mainWindow.evaluate(async () => {
      await window.__captivateScreenshot.closeOverlays()
    })
    return { ok: true, path: targetPath }
  }

  if (shot.openWindow) {
    const before = new Set(app.windows().map((w) => w))
    await mainWindow.evaluate(async (pageName) => {
      await window.__captivateScreenshot.openPageWindow(pageName)
    }, shot.openWindow)

    let target =
      (await findWindowByPage(app, shot.openWindow)) ||
      app.windows().find((w) => !before.has(w)) ||
      null

    if (!target) {
      console.warn(`  skip: detached window for ${shot.openWindow} not found`)
      return { ok: false, reason: 'window-missing' }
    }

    try {
      await waitForHarness(target, 15000)
    } catch {
      // Detached windows may not mount the same harness; still capture.
    }
    await sleep(settleMs)
    await target.screenshot({ path: targetPath })
    return { ok: true, path: targetPath }
  }

  await mainWindow.screenshot({ path: targetPath })
  return { ok: true, path: targetPath }
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true })

  const launch = resolveLaunch()
  console.log(`Launching: ${launch.executablePath}`)
  if (launch.args?.length) console.log(`Args: ${launch.args.join(' ')}`)
  console.log(`Output: ${outDir}`)

  const viewport = manifest.viewport || { width: 1440, height: 900 }
  const app = await electron.launch({
    executablePath: launch.executablePath,
    args: launch.args || [],
    cwd: launch.cwd,
    env: {
      ...process.env,
      ...(launch.envExtras || {}),
      CAPTIVATE_SCREENSHOT: '1',
    },
    timeout: 120000,
  })

  try {
    const mainWindow = await app.firstWindow({ timeout: 120000 })
    await mainWindow.setViewportSize(viewport)
    await waitForHarness(mainWindow)
    await sleep(settleMs)

    const projectPath = (
      process.env.CAPTIVATE_SCREENSHOT_PROJECT ||
      path.join(repoRoot, 'tools/screenshots/fixtures/demo.cap')
    ).trim()
    if (projectPath && fs.existsSync(projectPath)) {
      console.log(`Loading project: ${projectPath}`)
      await mainWindow.evaluate(async (filePath) => {
        await window.__captivateScreenshot.loadProject(filePath)
      }, projectPath)
      await sleep(settleMs)
    } else {
      console.warn(
        `Demo project not found (${projectPath || 'none'}); capturing current autosave.`
      )
    }

    const shots = (manifest.shots || []).filter(
      (shot) => only.size === 0 || only.has(shot.id)
    )

    let ok = 0
    let failed = 0
    for (const shot of shots) {
      try {
        const result = await captureShot(app, mainWindow, shot)
        if (result.ok) ok += 1
        else failed += 1
      } catch (err) {
        failed += 1
        console.error(`  error (${shot.id}):`, err?.message || err)
      }
    }

    console.log(`Done: ${ok} captured, ${failed} failed/skipped`)
    if (ok === 0) process.exitCode = 1
  } finally {
    // Packaged/local Electron can hang on graceful close; force-kill the process tree.
    const proc = app.process()
    const pid = proc?.pid
    await Promise.race([app.close().catch(() => {}), sleep(1500)])
    if (pid) {
      try {
        if (process.platform === 'win32') {
          const { spawnSync } = await import('node:child_process')
          spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
            stdio: 'ignore',
          })
        } else {
          process.kill(pid, 'SIGKILL')
        }
      } catch {
        // already gone
      }
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
