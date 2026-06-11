import path from 'path'
import { promises as fs } from 'fs'
import { randomUUID } from 'crypto'
import { app } from 'electron'
import type {
  TelemetryCounterSnapshot,
  TelemetryExportResult,
  TelemetryGaugeSnapshot,
  TelemetryHealthSnapshot,
  TelemetryMark,
  TelemetryRecentEvent,
  TelemetrySnapshot,
  TelemetryTimerSnapshot,
} from '../../shared/telemetry'
import { reportDiagnostic } from '../diagnostics'
import { appendUnifiedVerboseDiagnostic } from './unifiedVerboseLog'

const MAX_TIMER_SAMPLES = 240
const MAX_RECENT_EVENTS = 400
const DEFAULT_PROCESS_SAMPLE_MS = 2000
const DEFAULT_LOOP_SAMPLE_MS = 1000

interface TimerBucket {
  count: number
  totalMs: number
  minMs: number
  maxMs: number
  lastMs: number
  updatedAtMs: number
  samples: number[]
}

interface CounterBucket {
  value: number
  updatedAtMs: number
}

interface GaugeBucket {
  value: number
  unit?: string
  updatedAtMs: number
}

interface HealthBucket {
  status: 'ok' | 'warn' | 'error'
  message?: string
  data?: unknown
  updatedAtMs: number
}

function computePercentile(values: number[], percentile: number): number {
  if (values.length === 0) {
    return 0
  }
  if (values.length === 1) {
    return values[0]
  }
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round((sorted.length - 1) * percentile))
  )
  return sorted[index]
}

function normalizeKey(subsystem: string, metric: string): string {
  const left = subsystem.trim()
  const right = metric.trim()
  return `${left.length > 0 ? left : 'unknown'}.${right.length > 0 ? right : 'metric'}`
}

function resolveTelemetryDir() {
  try {
    return app.getPath('logs')
  } catch {
    return process.cwd()
  }
}

function safeNow() {
  return Date.now()
}

export default class TelemetryHub {
  private readonly source: string
  private readonly sessionId: string
  private readonly startedAtMs: number
  private counters = new Map<string, CounterBucket>()
  private gauges = new Map<string, GaugeBucket>()
  private timers = new Map<string, TimerBucket>()
  private health = new Map<string, HealthBucket>()
  private recentEvents: TelemetryRecentEvent[] = []
  private processSampleTimer: NodeJS.Timeout | null = null
  private eventLoopSampleTimer: NodeJS.Timeout | null = null
  private previousCpu = process.cpuUsage()
  private previousCpuSampleAtMs = safeNow()
  private eventLoopExpectedAtMs = safeNow()

  constructor(source: string) {
    this.source = source
    this.sessionId = randomUUID()
    this.startedAtMs = safeNow()
  }

  start() {
    this.setHealth('telemetry', 'ok', 'Telemetry active')
    this.startProcessSampler()
    this.startEventLoopSampler()
  }

  stop() {
    if (this.processSampleTimer !== null) {
      clearInterval(this.processSampleTimer)
      this.processSampleTimer = null
    }
    if (this.eventLoopSampleTimer !== null) {
      clearInterval(this.eventLoopSampleTimer)
      this.eventLoopSampleTimer = null
    }
  }

  incrementCounter(subsystem: string, metric: string, by = 1) {
    if (!Number.isFinite(by) || by === 0) {
      return
    }
    const key = normalizeKey(subsystem, metric)
    const now = safeNow()
    const existing = this.counters.get(key)
    if (existing !== undefined) {
      existing.value += by
      existing.updatedAtMs = now
      return
    }
    this.counters.set(key, {
      value: by,
      updatedAtMs: now,
    })
  }

  setGauge(subsystem: string, metric: string, value: number, unit?: string) {
    if (!Number.isFinite(value)) {
      return
    }
    const key = normalizeKey(subsystem, metric)
    this.gauges.set(key, {
      value,
      unit,
      updatedAtMs: safeNow(),
    })
  }

  setHealth(
    subsystem: string,
    status: 'ok' | 'warn' | 'error',
    message?: string,
    data?: unknown
  ) {
    const key = subsystem.trim().length > 0 ? subsystem.trim() : 'unknown'
    this.health.set(key, {
      status,
      message,
      data,
      updatedAtMs: safeNow(),
    })
  }

  recordDuration(subsystem: string, metric: string, durationMs: number) {
    if (!Number.isFinite(durationMs) || durationMs < 0) {
      return
    }
    const key = normalizeKey(subsystem, metric)
    const now = safeNow()
    const existing = this.timers.get(key)
    if (existing !== undefined) {
      existing.count += 1
      existing.totalMs += durationMs
      existing.minMs = Math.min(existing.minMs, durationMs)
      existing.maxMs = Math.max(existing.maxMs, durationMs)
      existing.lastMs = durationMs
      existing.updatedAtMs = now
      existing.samples.push(durationMs)
      if (existing.samples.length > MAX_TIMER_SAMPLES) {
        existing.samples.shift()
      }
      return
    }
    this.timers.set(key, {
      count: 1,
      totalMs: durationMs,
      minMs: durationMs,
      maxMs: durationMs,
      lastMs: durationMs,
      updatedAtMs: now,
      samples: [durationMs],
    })
  }

  recordEvent(
    subsystem: string,
    event: string,
    level: 'info' | 'warn' | 'error' = 'info',
    message?: string,
    data?: unknown
  ) {
    this.recentEvents.push({
      ts: safeNow(),
      level,
      source: this.source,
      subsystem,
      event,
      message,
      data,
    })
    if (this.recentEvents.length > MAX_RECENT_EVENTS) {
      this.recentEvents.shift()
    }
    if (level === 'info') {
      appendUnifiedVerboseDiagnostic({
        source: this.source,
        area: subsystem,
        event,
        level,
        message,
        data,
        ts: safeNow(),
      })
    } else {
      reportDiagnostic({
        source: this.source,
        area: subsystem,
        event,
        level,
        message,
        data,
      })
    }
  }

  ingestMark(mark: TelemetryMark) {
    const subsystem =
      typeof mark.subsystem === 'string' ? mark.subsystem : 'unknown'
    const metric = typeof mark.metric === 'string' ? mark.metric : 'metric'
    if (mark.type === 'counter') {
      this.incrementCounter(subsystem, metric, Number(mark.by ?? 1))
      return
    }
    if (mark.type === 'gauge') {
      this.setGauge(subsystem, metric, Number(mark.value ?? 0), mark.unit)
      return
    }
    if (mark.type === 'duration') {
      this.recordDuration(subsystem, metric, Number(mark.durationMs ?? 0))
      return
    }
    if (mark.type === 'health') {
      this.setHealth(
        subsystem,
        mark.status ?? 'ok',
        mark.message,
        mark.data
      )
      return
    }
    this.recordEvent(
      subsystem,
      metric,
      mark.level ?? 'info',
      mark.message,
      mark.data
    )
  }

  time<T>(subsystem: string, metric: string, fn: () => T): T {
    const startedAt = performance.now()
    try {
      return fn()
    } finally {
      this.recordDuration(subsystem, metric, performance.now() - startedAt)
    }
  }

  snapshot(): TelemetrySnapshot {
    const generatedAtMs = safeNow()
    const counters: Record<string, TelemetryCounterSnapshot> = {}
    const gauges: Record<string, TelemetryGaugeSnapshot> = {}
    const timers: Record<string, TelemetryTimerSnapshot> = {}
    const health: Record<string, TelemetryHealthSnapshot> = {}

    this.counters.forEach((bucket, key) => {
      counters[key] = {
        value: bucket.value,
        updatedAtMs: bucket.updatedAtMs,
      }
    })
    this.gauges.forEach((bucket, key) => {
      gauges[key] = {
        value: bucket.value,
        unit: bucket.unit,
        updatedAtMs: bucket.updatedAtMs,
      }
    })
    this.timers.forEach((bucket, key) => {
      const avgMs = bucket.count > 0 ? bucket.totalMs / bucket.count : 0
      timers[key] = {
        count: bucket.count,
        totalMs: bucket.totalMs,
        avgMs,
        minMs: bucket.minMs,
        maxMs: bucket.maxMs,
        p50Ms: computePercentile(bucket.samples, 0.5),
        p95Ms: computePercentile(bucket.samples, 0.95),
        lastMs: bucket.lastMs,
        updatedAtMs: bucket.updatedAtMs,
      }
    })
    this.health.forEach((bucket, key) => {
      health[key] = {
        status: bucket.status,
        message: bucket.message,
        data: bucket.data,
        updatedAtMs: bucket.updatedAtMs,
      }
    })

    return {
      sessionId: this.sessionId,
      source: this.source,
      startedAtMs: this.startedAtMs,
      generatedAtMs,
      uptimeMs: Math.max(0, generatedAtMs - this.startedAtMs),
      counters,
      gauges,
      timers,
      health,
      recentEvents: [...this.recentEvents],
    }
  }

  async exportSnapshot(): Promise<TelemetryExportResult> {
    const snapshot = this.snapshot()
    const fileName = `captivate-telemetry-${snapshot.generatedAtMs}.json`
    const destination = path.join(resolveTelemetryDir(), fileName)
    await fs.mkdir(path.dirname(destination), { recursive: true })
    await fs.writeFile(destination, JSON.stringify(snapshot, null, 2), 'utf8')
    return {
      filePath: destination,
      snapshot,
    }
  }

  private startProcessSampler() {
    this.processSampleTimer = setInterval(() => {
      const now = safeNow()
      const mem = process.memoryUsage()
      this.setGauge(
        'process',
        'rss_mb',
        mem.rss / (1024 * 1024),
        'MB'
      )
      this.setGauge(
        'process',
        'heap_used_mb',
        mem.heapUsed / (1024 * 1024),
        'MB'
      )
      this.setGauge(
        'process',
        'heap_total_mb',
        mem.heapTotal / (1024 * 1024),
        'MB'
      )
      this.setGauge(
        'process',
        'external_mb',
        mem.external / (1024 * 1024),
        'MB'
      )
      const cpu = process.cpuUsage(this.previousCpu)
      const elapsedUs = Math.max(1, (now - this.previousCpuSampleAtMs) * 1000)
      const cpuPercent = ((cpu.user + cpu.system) / elapsedUs) * 100
      this.setGauge('process', 'cpu_percent', cpuPercent, '%')
      this.previousCpu = process.cpuUsage()
      this.previousCpuSampleAtMs = now
    }, DEFAULT_PROCESS_SAMPLE_MS)
    this.processSampleTimer.unref()
  }

  private startEventLoopSampler() {
    this.eventLoopExpectedAtMs = safeNow() + DEFAULT_LOOP_SAMPLE_MS
    this.eventLoopSampleTimer = setInterval(() => {
      const now = safeNow()
      const lagMs = Math.max(0, now - this.eventLoopExpectedAtMs)
      this.eventLoopExpectedAtMs = now + DEFAULT_LOOP_SAMPLE_MS
      this.setGauge('process', 'event_loop_lag_ms', lagMs, 'ms')
      this.recordDuration('process', 'event_loop_lag', lagMs)
      if (lagMs >= 250) {
        this.recordEvent(
          'process',
          'event-loop-lag',
          'warn',
          'Main process event loop lag exceeded threshold',
          { lagMs }
        )
      }
    }, DEFAULT_LOOP_SAMPLE_MS)
    this.eventLoopSampleTimer.unref()
  }
}
