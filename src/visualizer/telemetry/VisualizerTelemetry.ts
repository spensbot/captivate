import { sendDiagnosticsEvent, sendTelemetryMark } from '../ipcHandler'

const HEARTBEAT_MS = 2000
const LOOP_SAMPLE_MS = 1000
const LIVE_SAMPLE_MS = 5000

export default class VisualizerTelemetry {
  private readonly source: string
  private started = false
  private expectedLoopAtMs = 0
  private loopTimer: number | null = null
  private heartbeatTimer: number | null = null
  private rafLastAtMs = 0
  private rafFpsEma = 60
  private frameDtEmaMs = 16.67
  private updateDtEmaMs = 4
  private skippedFrames = 0
  private longFrameStreak = 0
  private fpsHistory: number[] = []
  private collapseAlertCooldownUntilMs = 0
  private heapUsedLastMb = 0
  private heapGrowthAlertCooldownUntilMs = 0
  private lastLiveSampleAtMs = 0

  constructor(source: string) {
    this.source = source
  }

  start() {
    if (this.started) {
      return
    }
    this.started = true
    this.expectedLoopAtMs = performance.now() + LOOP_SAMPLE_MS

    this.loopTimer = window.setInterval(() => {
      const now = performance.now()
      const lagMs = Math.max(0, now - this.expectedLoopAtMs)
      this.expectedLoopAtMs = now + LOOP_SAMPLE_MS
      sendTelemetryMark({
        source: this.source,
        subsystem: 'visualizer.performance',
        metric: 'event_loop_lag',
        type: 'duration',
        durationMs: lagMs,
      })
      if (lagMs >= 300) {
        sendDiagnosticsEvent({
          source: this.source,
          area: 'visualizer',
          event: 'event-loop-lag',
          level: 'warn',
          message: 'Visualizer event loop lag exceeded threshold',
          data: { lagMs },
        })
      }
    }, LOOP_SAMPLE_MS)

    this.heartbeatTimer = window.setInterval(() => {
      const heartbeatAtMs = Date.now()
      let heapUsedMb: number | undefined
      let heapTotalMb: number | undefined

      sendTelemetryMark({
        source: this.source,
        subsystem: 'visualizer.performance',
        metric: 'raf_fps',
        type: 'gauge',
        value: this.rafFpsEma,
        unit: 'fps',
      })
      sendTelemetryMark({
        source: this.source,
        subsystem: 'visualizer.performance',
        metric: 'frame_dt_ms',
        type: 'gauge',
        value: this.frameDtEmaMs,
        unit: 'ms',
      })
      sendTelemetryMark({
        source: this.source,
        subsystem: 'visualizer.performance',
        metric: 'update_dt_ms',
        type: 'gauge',
        value: this.updateDtEmaMs,
        unit: 'ms',
      })
      sendTelemetryMark({
        source: this.source,
        subsystem: 'visualizer.performance',
        metric: 'skipped_frames',
        type: 'counter',
        by: this.skippedFrames,
      })
      this.skippedFrames = 0

      const memory = (performance as any).memory as
        | { usedJSHeapSize: number; totalJSHeapSize: number }
        | undefined
      if (memory !== undefined) {
        heapUsedMb = memory.usedJSHeapSize / (1024 * 1024)
        heapTotalMb = memory.totalJSHeapSize / (1024 * 1024)
        sendTelemetryMark({
          source: this.source,
          subsystem: 'visualizer.performance',
          metric: 'js_heap_used_mb',
          type: 'gauge',
          value: heapUsedMb,
          unit: 'MB',
        })
        sendTelemetryMark({
          source: this.source,
          subsystem: 'visualizer.performance',
          metric: 'js_heap_total_mb',
          type: 'gauge',
          value: heapTotalMb,
          unit: 'MB',
        })
        const now = Date.now()
        if (
          this.heapUsedLastMb > 0 &&
          heapUsedMb - this.heapUsedLastMb >= 250 &&
          now >= this.heapGrowthAlertCooldownUntilMs
        ) {
          this.heapGrowthAlertCooldownUntilMs = now + 60000
          sendDiagnosticsEvent({
            source: this.source,
            area: 'visualizer',
            event: 'heap-growth-spike',
            level: 'warn',
            message: 'Visualizer heap usage grew sharply',
            data: {
              previousUsedMb: this.heapUsedLastMb,
              currentUsedMb: heapUsedMb,
              deltaMb: heapUsedMb - this.heapUsedLastMb,
            },
          })
          sendTelemetryMark({
            source: this.source,
            subsystem: 'visualizer.performance',
            metric: 'heap_growth_spike',
            type: 'event',
            level: 'warn',
            message: 'Visualizer heap usage grew sharply',
            data: {
              previousUsedMb: this.heapUsedLastMb,
              currentUsedMb: heapUsedMb,
              deltaMb: heapUsedMb - this.heapUsedLastMb,
            },
          })
        }
        this.heapUsedLastMb = heapUsedMb
      }

      this.fpsHistory.push(this.rafFpsEma)
      if (this.fpsHistory.length > 8) {
        this.fpsHistory.shift()
      }
      this.emitCollapseSignalsIfNeeded()

      sendTelemetryMark({
        source: this.source,
        subsystem: 'visualizer',
        metric: 'health',
        type: 'health',
        status: 'ok',
        message: 'Visualizer heartbeat',
      })

      if (heartbeatAtMs - this.lastLiveSampleAtMs >= LIVE_SAMPLE_MS) {
        this.lastLiveSampleAtMs = heartbeatAtMs
        sendDiagnosticsEvent({
          source: this.source,
          area: 'visualizer',
          event: 'live-sample',
          level: 'info',
          message: 'Visualizer live performance sample',
          data: {
            rafFpsEma: this.rafFpsEma,
            frameDtEmaMs: this.frameDtEmaMs,
            updateDtEmaMs: this.updateDtEmaMs,
            skippedFramesRecent: this.skippedFrames,
            heapUsedMb,
            heapTotalMb,
          },
        })
      }
    }, HEARTBEAT_MS)

    sendTelemetryMark({
      source: this.source,
      subsystem: 'visualizer',
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
    if (this.loopTimer !== null) {
      window.clearInterval(this.loopTimer)
      this.loopTimer = null
    }
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    sendTelemetryMark({
      source: this.source,
      subsystem: 'visualizer',
      metric: 'stopped',
      type: 'counter',
      by: 1,
    })
  }

  onFrame(nowMs: number) {
    this.onFrameSample(nowMs, undefined, undefined, false)
  }

  onFrameSample(
    nowMs: number,
    frameDtMs?: number,
    updateDtMs?: number,
    skipped = false
  ) {
    if (skipped) {
      this.skippedFrames += 1
    }
    if (this.rafLastAtMs > 0) {
      const dt = Math.max(1, frameDtMs ?? nowMs - this.rafLastAtMs)
      const fps = 1000 / dt
      this.rafFpsEma += (fps - this.rafFpsEma) * 0.08
      this.frameDtEmaMs += (dt - this.frameDtEmaMs) * 0.08
      if (dt >= 180) {
        this.longFrameStreak += 1
      } else if (this.longFrameStreak > 0) {
        this.longFrameStreak -= 1
      }
      if (this.longFrameStreak >= 12) {
        this.longFrameStreak = 0
        sendDiagnosticsEvent({
          source: this.source,
          area: 'visualizer',
          event: 'long-frame-streak',
          level: 'warn',
          message: 'Visualizer detected sustained long-frame streak',
          data: {
            frameDtMs: dt,
            rafFpsEma: this.rafFpsEma,
          },
        })
      }
    }
    if (updateDtMs !== undefined && Number.isFinite(updateDtMs)) {
      const safeUpdateMs = Math.max(0, updateDtMs)
      this.updateDtEmaMs += (safeUpdateMs - this.updateDtEmaMs) * 0.1
      if (safeUpdateMs >= 120) {
        sendTelemetryMark({
          source: this.source,
          subsystem: 'visualizer.performance',
          metric: 'update_spike',
          type: 'event',
          level: 'warn',
          message: 'Visualizer update step exceeded threshold',
          data: {
            updateDtMs: safeUpdateMs,
          },
        })
      }
    }
    this.rafLastAtMs = nowMs
  }

  private emitCollapseSignalsIfNeeded() {
    const now = Date.now()
    if (now < this.collapseAlertCooldownUntilMs) {
      return
    }
    if (this.fpsHistory.length < 5) {
      return
    }
    const first = this.fpsHistory[0]
    const last = this.fpsHistory[this.fpsHistory.length - 1]
    if (!(first >= 35 && last <= 8)) {
      return
    }
    let decreasing = true
    for (let i = 1; i < this.fpsHistory.length; i++) {
      if (this.fpsHistory[i] > this.fpsHistory[i - 1] + 0.5) {
        decreasing = false
        break
      }
    }
    if (!decreasing) {
      return
    }
    this.collapseAlertCooldownUntilMs = now + 60000
    sendDiagnosticsEvent({
      source: this.source,
      area: 'visualizer',
      event: 'fps-collapse-detected',
      level: 'warn',
      message: 'Visualizer FPS trend indicates collapse over time',
      data: {
        fpsHistory: [...this.fpsHistory],
        frameDtEmaMs: this.frameDtEmaMs,
        updateDtEmaMs: this.updateDtEmaMs,
      },
    })
    sendTelemetryMark({
      source: this.source,
      subsystem: 'visualizer.performance',
      metric: 'fps_collapse_detected',
      type: 'event',
      level: 'warn',
      message: 'Visualizer FPS trend indicates collapse over time',
      data: {
        fpsHistory: [...this.fpsHistory],
        frameDtEmaMs: this.frameDtEmaMs,
        updateDtEmaMs: this.updateDtEmaMs,
      },
    })
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
