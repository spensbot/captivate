import path from 'path'
import { promises as fs } from 'fs'
import { app } from 'electron'
import type { DiagnosticsEvent } from '../shared/diagnostics'

interface StoredDiagnosticEvent extends DiagnosticsEvent {
  ts: number
  isoTime: string
}
const MAX_LOG_BYTES = 10 * 1024 * 1024
const MAX_LOG_ROTATIONS = 3

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

function normalizeEvent(event: DiagnosticsEvent): StoredDiagnosticEvent {
  const ts = Number.isFinite(event.ts) ? Number(event.ts) : Date.now()
  return {
    ...event,
    level: event.level ?? 'info',
    ts,
    isoTime: new Date(ts).toISOString(),
  }
}

function safeSerialize(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return JSON.stringify({
      source: 'main',
      area: 'diagnostics',
      event: 'serialize-failed',
      level: 'error',
      ts: Date.now(),
      isoTime: new Date().toISOString(),
      message: 'Failed to serialize diagnostics payload',
    })
  }
}

export function reportDiagnostic(event: DiagnosticsEvent) {
  const normalized = normalizeEvent(event)
  const serialized = safeSerialize(normalized)
  if (normalized.level === 'error') {
    console.error(`[diag:${normalized.area}:${normalized.event}]`, normalized.message ?? '')
  } else if (normalized.level === 'warn') {
    console.warn(`[diag:${normalized.area}:${normalized.event}]`, normalized.message ?? '')
  } else {
    console.log(`[diag:${normalized.area}:${normalized.event}]`, normalized.message ?? '')
  }

  const destinations = new Set<string>()
  const primaryLogDir = resolveLogDir()
  destinations.add(path.join(primaryLogDir, 'captivate-diagnostics.log'))
  destinations.add(path.join(process.cwd(), 'captivate-diagnostics.log'))
  if (process.env.TEMP) {
    destinations.add(path.join(process.env.TEMP, 'captivate-diagnostics.log'))
  }

  for (const destination of destinations) {
    const dir = path.dirname(destination)
    void fs
      .mkdir(dir, { recursive: true })
      .then(async () => {
        await rotateIfNeeded(destination)
        await fs.appendFile(destination, `${serialized}\n`, 'utf8')
      })
      .catch((error) => {
        console.error('Failed to append diagnostics log', destination, error)
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
    } catch {}
  }
  try {
    await fs.rename(destination, `${destination}.1`)
  } catch {}
}
