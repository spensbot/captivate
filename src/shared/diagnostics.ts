export type DiagnosticLevel = 'info' | 'warn' | 'error'

export interface DiagnosticsEvent {
  source: string
  area: string
  event: string
  level?: DiagnosticLevel
  message?: string
  data?: unknown
  ts?: number
}

