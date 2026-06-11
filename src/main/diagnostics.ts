import type { DiagnosticsEvent } from '../shared/diagnostics'
import { appendUnifiedVerboseDiagnostic } from './telemetry/unifiedVerboseLog'

interface StoredDiagnosticEvent extends DiagnosticsEvent {
  ts: number
  isoTime: string
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

export function reportDiagnostic(event: DiagnosticsEvent) {
  const normalized = normalizeEvent(event)
  if (normalized.level === 'error') {
    console.error(
      `[diag:${normalized.area}:${normalized.event}]`,
      normalized.message ?? ''
    )
  } else if (normalized.level === 'warn') {
    console.warn(
      `[diag:${normalized.area}:${normalized.event}]`,
      normalized.message ?? ''
    )
  } else {
    console.log(
      `[diag:${normalized.area}:${normalized.event}]`,
      normalized.message ?? ''
    )
  }

  appendUnifiedVerboseDiagnostic(normalized)
}
