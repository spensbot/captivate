import type {
  DebugLogExportResult,
  TelemetryExportResult,
  TelemetryMark,
  TelemetrySnapshot,
} from '../../shared/telemetry'
import { dialog } from 'electron'
import path from 'path'
import { promises as fs } from 'fs'
import TelemetryHub from './TelemetryHub'
import {
  appendUnifiedVerboseMark,
  collectUnifiedVerboseLogLines,
  formatDebugLogExportFileName,
  getUnifiedVerboseLogPath,
  getUnifiedVerboseLogSessionId,
  initUnifiedVerboseLog,
  serializeVerboseLogRecord,
} from './unifiedVerboseLog'

const mainTelemetry = new TelemetryHub('main')

export function startMainTelemetry() {
  initUnifiedVerboseLog()
  mainTelemetry.start()
}

export function stopMainTelemetry() {
  mainTelemetry.stop()
}

export function telemetryCounter(subsystem: string, metric: string, by = 1) {
  mainTelemetry.incrementCounter(subsystem, metric, by)
}

export function telemetryGauge(
  subsystem: string,
  metric: string,
  value: number,
  unit?: string
) {
  mainTelemetry.setGauge(subsystem, metric, value, unit)
}

export function telemetryDuration(
  subsystem: string,
  metric: string,
  durationMs: number
) {
  mainTelemetry.recordDuration(subsystem, metric, durationMs)
}

const sampledTelemetryLastAtMs = new Map<string, number>()

function shouldSampleTelemetry(
  subsystem: string,
  metric: string,
  minIntervalMs: number
): boolean {
  const key = `${subsystem}.${metric}`
  const now = Date.now()
  const lastAt = sampledTelemetryLastAtMs.get(key) ?? 0
  if (now - lastAt < minIntervalMs) {
    return false
  }
  sampledTelemetryLastAtMs.set(key, now)
  return true
}

/** Record a gauge at most once per interval (for hot realtime loops). */
export function telemetryGaugeSampled(
  subsystem: string,
  metric: string,
  value: number,
  unit?: string,
  minIntervalMs = 1000
) {
  if (!shouldSampleTelemetry(subsystem, metric, minIntervalMs)) {
    return
  }
  telemetryGauge(subsystem, metric, value, unit)
}

/** Record a duration at most once per interval (for hot realtime loops). */
export function telemetryDurationSampled(
  subsystem: string,
  metric: string,
  durationMs: number,
  minIntervalMs = 1000
) {
  if (!shouldSampleTelemetry(subsystem, metric, minIntervalMs)) {
    return
  }
  telemetryDuration(subsystem, metric, durationMs)
}

/** Set health at most once per interval unless status is error. */
export function telemetryHealthSampled(
  subsystem: string,
  status: 'ok' | 'warn' | 'error',
  message?: string,
  data?: unknown,
  minIntervalMs = 2000
) {
  if (
    status !== 'error' &&
    !shouldSampleTelemetry(subsystem, 'health', minIntervalMs)
  ) {
    return
  }
  telemetryHealth(subsystem, status, message, data)
}

export function telemetryHealth(
  subsystem: string,
  status: 'ok' | 'warn' | 'error',
  message?: string,
  data?: unknown
) {
  mainTelemetry.setHealth(subsystem, status, message, data)
}

export function telemetryEvent(
  subsystem: string,
  event: string,
  level: 'info' | 'warn' | 'error' = 'info',
  message?: string,
  data?: unknown
) {
  mainTelemetry.recordEvent(subsystem, event, level, message, data)
}

export function telemetryMark(mark: TelemetryMark) {
  appendUnifiedVerboseMark(mark)
  mainTelemetry.ingestMark(mark)
}

export function telemetryTime<T>(subsystem: string, metric: string, fn: () => T): T {
  return mainTelemetry.time(subsystem, metric, fn)
}

export function getTelemetrySnapshot(): TelemetrySnapshot {
  return mainTelemetry.snapshot()
}

export async function exportTelemetrySnapshot(): Promise<TelemetryExportResult> {
  return await mainTelemetry.exportSnapshot()
}

export async function exportDebugLog(
  parentWindow?: import('electron').BrowserWindow | null
): Promise<DebugLogExportResult> {
  const logLines = await collectUnifiedVerboseLogLines()
  const snapshot = getTelemetrySnapshot()
  const snapshotLine = serializeVerboseLogRecord({
    kind: 'telemetry_snapshot',
    snapshot,
  })

  const defaultPath = path.join(
    path.dirname(getUnifiedVerboseLogPath()),
    formatDebugLogExportFileName()
  )
  const saveResult = parentWindow
    ? await dialog.showSaveDialog(parentWindow, {
        title: 'Export Debug Log',
        defaultPath,
        filters: [{ name: 'Captivate Debug Log', extensions: ['ndjson', 'log'] }],
      })
    : await dialog.showSaveDialog({
        title: 'Export Debug Log',
        defaultPath,
        filters: [{ name: 'Captivate Debug Log', extensions: ['ndjson', 'log'] }],
      })
  if (saveResult.canceled || !saveResult.filePath) {
    throw new Error('Debug log export cancelled.')
  }

  const payload = [...logLines, snapshotLine].join('\n') + '\n'
  await fs.mkdir(path.dirname(saveResult.filePath), { recursive: true })
  await fs.writeFile(saveResult.filePath, payload, 'utf8')

  return {
    filePath: saveResult.filePath,
    lineCount: logLines.length + 1,
    bytesWritten: Buffer.byteLength(payload, 'utf8'),
    sessionId: getUnifiedVerboseLogSessionId(),
  }
}

export { getUnifiedVerboseLogPath } from './unifiedVerboseLog'
