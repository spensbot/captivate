import path from 'path'
import { randomUUID } from 'crypto'
import { promises as fs } from 'fs'
import { app } from 'electron'
import type { DiagnosticsEvent } from '../../shared/diagnostics'
import type { TelemetryMark } from '../../shared/telemetry'

const FILE_NAME = 'captivate-verbose.ndjson'
const MAX_LOG_BYTES = 10 * 1024 * 1024
const MAX_LOG_ROTATIONS = 3
/** High-frequency gauge marks (e.g. Lighting 3D FPS) are sampled at most once per key per interval. */
const GAUGE_LOG_INTERVAL_MS = 1000

let sessionId = randomUUID()
const gaugeLastLoggedMs = new Map<string, number>()

function resolveLogDir(): string {
  try {
    return app.getPath('logs')
  } catch {
    try {
      return app.getPath('userData')
    } catch {
      return process.cwd()
    }
  }
}

export function getUnifiedVerboseLogPath(): string {
  return path.join(resolveLogDir(), FILE_NAME)
}

function safeSerialize(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return JSON.stringify({
      kind: 'serialize_failed',
      receivedAtMs: Date.now(),
      isoTime: new Date().toISOString(),
      sessionId,
    })
  }
}

async function rotateIfNeeded(destination: string) {
  let size = 0
  try {
    const stat = await fs.stat(destination)
    size = stat.size
  } catch {
    size = 0
  }
  if (size < MAX_LOG_BYTES) {
    return
  }

  for (let index = MAX_LOG_ROTATIONS - 1; index >= 1; index--) {
    const source = `${destination}.${index}`
    const target = `${destination}.${index + 1}`
    try {
      await fs.rename(source, target)
    } catch {
      // ignore missing rotation slot
    }
  }
  try {
    await fs.rename(destination, `${destination}.1`)
  } catch {
    // ignore
  }
}

function appendLine(record: Record<string, unknown>): void {
  const destination = getUnifiedVerboseLogPath()
  const line =
    safeSerialize({
      receivedAtMs: Date.now(),
      isoTime: new Date().toISOString(),
      sessionId,
      ...record,
    }) + '\n'

  void fs
    .mkdir(path.dirname(destination), { recursive: true })
    .then(async () => {
      await rotateIfNeeded(destination)
      await fs.appendFile(destination, line, 'utf8')
    })
    .catch(() => {
      // ignore disk full / AV locks
    })
}

function gaugeLogKey(mark: TelemetryMark): string {
  const source = typeof mark.source === 'string' ? mark.source : 'unknown'
  const subsystem =
    typeof mark.subsystem === 'string' ? mark.subsystem : 'unknown'
  const metric = typeof mark.metric === 'string' ? mark.metric : 'metric'
  return `${source}:${subsystem}:${metric}`
}

function shouldLogGaugeMark(mark: TelemetryMark): boolean {
  const now = Date.now()
  const key = gaugeLogKey(mark)
  const last = gaugeLastLoggedMs.get(key) ?? 0
  if (now - last < GAUGE_LOG_INTERVAL_MS) {
    return false
  }
  gaugeLastLoggedMs.set(key, now)
  return true
}

/** Write session header when the main process telemetry starts. */
export function initUnifiedVerboseLog(): void {
  appendLine({
    kind: 'session_start',
    appVersion: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
    pid: process.pid,
    env: process.env.NODE_ENV ?? 'production',
  })
}

export function appendUnifiedVerboseDiagnostic(
  event: DiagnosticsEvent & { isoTime?: string; ts?: number }
): void {
  appendLine({
    kind: 'diagnostic',
    ...event,
  })
}

export function appendUnifiedVerboseMark(mark: TelemetryMark): void {
  if (mark.type === 'gauge' && !shouldLogGaugeMark(mark)) {
    return
  }
  appendLine({
    kind: 'mark',
    ...mark,
  })
}

async function readLogFileIfExists(filePath: string): Promise<string[]> {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    return raw.split('\n').filter((line) => line.trim().length > 0)
  } catch {
    return []
  }
}

/** Oldest rotation first, then current file. */
export async function collectUnifiedVerboseLogLines(): Promise<string[]> {
  const base = getUnifiedVerboseLogPath()
  const orderedPaths = [
    `${base}.${MAX_LOG_ROTATIONS}`,
    `${base}.${MAX_LOG_ROTATIONS - 1}`,
    `${base}.1`,
    base,
  ]
  const lines: string[] = []
  for (const filePath of orderedPaths) {
    lines.push(...(await readLogFileIfExists(filePath)))
  }
  return lines
}

export function getUnifiedVerboseLogSessionId(): string {
  return sessionId
}

export function formatDebugLogExportFileName(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `captivate-debug-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.ndjson`
  )
}

export function serializeVerboseLogRecord(record: Record<string, unknown>): string {
  return safeSerialize({
    receivedAtMs: Date.now(),
    isoTime: new Date().toISOString(),
    sessionId,
    ...record,
  })
}
