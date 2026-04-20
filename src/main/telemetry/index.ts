import type { TelemetryExportResult, TelemetryMark, TelemetrySnapshot } from '../../shared/telemetry'
import TelemetryHub from './TelemetryHub'
import { appendLighting3dLiveTelemetry } from './appendLighting3dLiveLog'

const mainTelemetry = new TelemetryHub('main')

export function startMainTelemetry() {
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
  appendLighting3dLiveTelemetry(mark)
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
