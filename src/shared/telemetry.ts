export type TelemetryHealthStatus = 'ok' | 'warn' | 'error'

export interface TelemetryCounterSnapshot {
  value: number
  updatedAtMs: number
}

export interface TelemetryGaugeSnapshot {
  value: number
  unit?: string
  updatedAtMs: number
}

export interface TelemetryTimerSnapshot {
  count: number
  totalMs: number
  avgMs: number
  minMs: number
  maxMs: number
  p50Ms: number
  p95Ms: number
  lastMs: number
  updatedAtMs: number
}

export interface TelemetryHealthSnapshot {
  status: TelemetryHealthStatus
  message?: string
  data?: unknown
  updatedAtMs: number
}

export interface TelemetryRecentEvent {
  ts: number
  level: 'info' | 'warn' | 'error'
  source: string
  subsystem: string
  event: string
  message?: string
  data?: unknown
}

export interface TelemetrySnapshot {
  sessionId: string
  source: string
  startedAtMs: number
  generatedAtMs: number
  uptimeMs: number
  counters: Record<string, TelemetryCounterSnapshot>
  gauges: Record<string, TelemetryGaugeSnapshot>
  timers: Record<string, TelemetryTimerSnapshot>
  health: Record<string, TelemetryHealthSnapshot>
  recentEvents: TelemetryRecentEvent[]
}

export type TelemetryMarkType =
  | 'counter'
  | 'gauge'
  | 'duration'
  | 'health'
  | 'event'

export interface TelemetryMark {
  source: string
  subsystem: string
  metric: string
  type: TelemetryMarkType
  ts?: number
  by?: number
  value?: number
  durationMs?: number
  unit?: string
  status?: TelemetryHealthStatus
  level?: 'info' | 'warn' | 'error'
  message?: string
  data?: unknown
}

export interface TelemetryExportResult {
  filePath: string
  snapshot: TelemetrySnapshot
}
