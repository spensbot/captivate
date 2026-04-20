import { sendDiagnosticsEvent, sendTelemetryMark } from '../ipcHandler'

/** Aligns with `src/renderer/index.tsx` so detached page windows tag telemetry consistently. */
export function currentRendererTelemetrySource(): string {
  if (typeof window === 'undefined') {
    return 'renderer-main'
  }
  const page = new URLSearchParams(window.location.search).get('page')
  return page ? 'renderer-page' : 'renderer-main'
}

const HEARTBEAT_MS = 2000
const LOOP_SAMPLE_MS = 1000

export default class RendererTelemetry {
  private readonly source: string
  private started = false
  private heartbeatTimer: number | null = null
  private eventLoopTimer: number | null = null
  private expectedLoopAtMs = 0
  private rafLastAtMs = 0
  private rafFpsEma = 60
  private lastErrorListener: ((event: ErrorEvent) => void) | null = null
  private lastRejectionListener: ((event: PromiseRejectionEvent) => void) | null =
    null

  constructor(source: string) {
    this.source = source
  }

  start() {
    if (this.started) {
      return
    }
    this.started = true
    this.expectedLoopAtMs = performance.now() + LOOP_SAMPLE_MS

    this.lastErrorListener = (event: ErrorEvent) => {
      sendDiagnosticsEvent({
        source: this.source,
        area: 'renderer',
        event: 'uncaught-error',
        level: 'error',
        message: event.message,
        data: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      })
      sendTelemetryMark({
        source: this.source,
        subsystem: 'renderer',
        metric: 'uncaught-error',
        type: 'event',
        level: 'error',
        message: event.message,
      })
    }
    window.addEventListener('error', this.lastErrorListener)

    this.lastRejectionListener = (event: PromiseRejectionEvent) => {
      const reason =
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason)
      sendDiagnosticsEvent({
        source: this.source,
        area: 'renderer',
        event: 'unhandled-rejection',
        level: 'error',
        message: reason,
      })
      sendTelemetryMark({
        source: this.source,
        subsystem: 'renderer',
        metric: 'unhandled-rejection',
        type: 'event',
        level: 'error',
        message: reason,
      })
    }
    window.addEventListener('unhandledrejection', this.lastRejectionListener)

    this.eventLoopTimer = window.setInterval(() => {
      const now = performance.now()
      const lagMs = Math.max(0, now - this.expectedLoopAtMs)
      this.expectedLoopAtMs = now + LOOP_SAMPLE_MS
      sendTelemetryMark({
        source: this.source,
        subsystem: 'renderer.performance',
        metric: 'event_loop_lag',
        type: 'duration',
        durationMs: lagMs,
      })
      sendTelemetryMark({
        source: this.source,
        subsystem: 'renderer.performance',
        metric: 'event_loop_lag_ms',
        type: 'gauge',
        value: lagMs,
        unit: 'ms',
      })
      if (lagMs >= 250) {
        sendDiagnosticsEvent({
          source: this.source,
          area: 'renderer',
          event: 'event-loop-lag',
          level: 'warn',
          message: 'Renderer event loop lag exceeded threshold',
          data: { lagMs },
        })
      }
    }, LOOP_SAMPLE_MS)

    this.heartbeatTimer = window.setInterval(() => {
      const memory = (performance as any).memory as
        | { usedJSHeapSize: number; totalJSHeapSize: number }
        | undefined
      if (memory !== undefined) {
        sendTelemetryMark({
          source: this.source,
          subsystem: 'renderer.performance',
          metric: 'js_heap_used_mb',
          type: 'gauge',
          value: memory.usedJSHeapSize / (1024 * 1024),
          unit: 'MB',
        })
        sendTelemetryMark({
          source: this.source,
          subsystem: 'renderer.performance',
          metric: 'js_heap_total_mb',
          type: 'gauge',
          value: memory.totalJSHeapSize / (1024 * 1024),
          unit: 'MB',
        })
      }
      sendTelemetryMark({
        source: this.source,
        subsystem: 'renderer.performance',
        metric: 'raf_fps',
        type: 'gauge',
        value: this.rafFpsEma,
        unit: 'fps',
      })
      sendTelemetryMark({
        source: this.source,
        subsystem: 'renderer',
        metric: 'health',
        type: 'health',
        status: 'ok',
        message: 'Renderer heartbeat',
      })
    }, HEARTBEAT_MS)

    sendTelemetryMark({
      source: this.source,
      subsystem: 'renderer',
      metric: 'started',
      type: 'counter',
      by: 1,
    })
  }

  stop() {
    if (!this.started) {
      return
    }
    this.started = false
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    if (this.eventLoopTimer !== null) {
      window.clearInterval(this.eventLoopTimer)
      this.eventLoopTimer = null
    }
    if (this.lastErrorListener !== null) {
      window.removeEventListener('error', this.lastErrorListener)
      this.lastErrorListener = null
    }
    if (this.lastRejectionListener !== null) {
      window.removeEventListener('unhandledrejection', this.lastRejectionListener)
      this.lastRejectionListener = null
    }
    sendTelemetryMark({
      source: this.source,
      subsystem: 'renderer',
      metric: 'stopped',
      type: 'counter',
      by: 1,
    })
  }

  onAnimationFrame(nowMs: number) {
    if (this.rafLastAtMs > 0) {
      const dt = Math.max(1, nowMs - this.rafLastAtMs)
      const fps = 1000 / dt
      this.rafFpsEma += (fps - this.rafFpsEma) * 0.08
    }
    this.rafLastAtMs = nowMs
  }

  gauge(subsystem: string, metric: string, value: number, unit?: string) {
    sendTelemetryMark({
      source: this.source,
      subsystem,
      metric,
      type: 'gauge',
      value,
      unit,
    })
  }

  duration(subsystem: string, metric: string, durationMs: number) {
    sendTelemetryMark({
      source: this.source,
      subsystem,
      metric,
      type: 'duration',
      durationMs,
    })
  }

  counter(subsystem: string, metric: string, by = 1) {
    sendTelemetryMark({
      source: this.source,
      subsystem,
      metric,
      type: 'counter',
      by,
    })
  }

  health(
    subsystem: string,
    status: 'ok' | 'warn' | 'error',
    message?: string,
    data?: unknown
  ) {
    sendTelemetryMark({
      source: this.source,
      subsystem,
      metric: 'health',
      type: 'health',
      status,
      message,
      data,
    })
  }
}
