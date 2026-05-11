import { getLedValues, normalizeLedFixtureForRuntime } from '../../../shared/ledFixtures'
import type { BaseColors } from '../../../shared/baseColors'
import type { Params } from '../../../shared/params'
import { SplitScene_t } from '../../../shared/Scenes'
import { fixtureGroupsMatchSceneGroups } from '../../../shared/sceneGroups'
import { EngineContext } from '../engineContext'
import WledDevice from './wled_device'
import { WledPixelTransportFormat } from './udp_buffer'
import {
  telemetryCounter,
  telemetryDuration,
  telemetryGauge,
  telemetryHealth,
} from '../../telemetry'

type HostEntry = {
  host: string
  device: WledDevice
  lastPwmFramesByKey: Map<string, string>
  lastPwmPostedAtMs: number
}

type PendingPwmFrame = {
  key: string
  segmentId: number | null
  red: number
  green: number
  blue: number
  white: number
}

export default class WledManager {
  private entriesByHost: { [host: string]: HostEntry | undefined } = {}
  private pokeInterval
  private broadcastInterval
  private c

  constructor(c: EngineContext) {
    this.c = c
    telemetryCounter('wled', 'manager_created')
    telemetryHealth('wled', 'ok', 'WLED manager started')

    this.updateDevices()

    this.pokeInterval = setInterval(() => {
      this.updateDevices()
    }, 1000)

    this.broadcastInterval = setInterval(() => {
      const startedAt = performance.now()
      const state = this.c.controlState()
      if (state === null) return

      const rtState = this.c.realtimeState()
      const activeLightScene = state.control.light.byId[state.control.light.active]
      const splitScenes = activeLightScene?.splitScenes ?? []

      const hostPixelSparseFrame = new Map<string, Map<number, BaseColors>>()
      const hostPixelFormat = new Map<string, WledPixelTransportFormat>()
      const hostPwmFrames = new Map<string, PendingPwmFrame[]>()

      for (const rawFixture of state.dmx.led.ledFixtures) {
        const fixture = normalizeLedFixtureForRuntime(rawFixture)
        const host = fixture.mdns.trim()
        if (host.length <= 0) {
          continue
        }

        const entry = this.entriesByHost[host]
        if (entry === undefined) {
          continue
        }

        const paramsList = resolveSplitParamsForFixture(
          fixture.groups,
          splitScenes,
          rtState.splitStates
        )
        if (paramsList.length === 0) {
          continue
        }

        const placementDepth2DOnly = state.gui.fxtrDepthOn !== true
        const layers = paramsList.map((params) =>
          getLedValues(params, fixture, state.control.master, placementDepth2DOnly)
        )
        const combinedColors = combineLedLayers(layers)
        if (combinedColors.length <= 0) {
          continue
        }

        const outputMode =
          fixture.controller.output_mode === 'auto'
            ? 'pixel'
            : fixture.controller.output_mode

        if (outputMode === 'pixel') {
          const hostFrame = hostPixelSparseFrame.get(host) ?? new Map<number, BaseColors>()
          const requestedFormat = (() => {
            const mode = fixture.controller.pixel_format
            if (mode === 'rgb' || mode === 'rgbw') return mode
            return 'rgbw'
          })()
          const currentHostFormat = hostPixelFormat.get(host)
          if (currentHostFormat === undefined) {
            hostPixelFormat.set(host, requestedFormat)
          } else if (requestedFormat === 'rgbw') {
            hostPixelFormat.set(host, 'rgbw')
          }
          const startIndex = Math.max(0, Math.round(fixture.controller.pixel_start))
          const requestedPixelCount =
            fixture.controller.pixel_count === null
              ? combinedColors.length
              : Math.max(1, Math.round(fixture.controller.pixel_count))
          const frameLength = Math.min(requestedPixelCount, combinedColors.length)

          for (let i = 0; i < frameLength; i++) {
            const targetIndex = startIndex + i
            if (targetIndex < 0) continue
            const source = combinedColors[i]
            if (source === undefined) continue
            const current = hostFrame.get(targetIndex) ?? {
              red: 0,
              green: 0,
              blue: 0,
            }
            current.red = Math.max(current.red, source.red)
            current.green = Math.max(current.green, source.green)
            current.blue = Math.max(current.blue, source.blue)
            hostFrame.set(targetIndex, current)
          }

          hostPixelSparseFrame.set(host, hostFrame)
          continue
        }

        const peak = getPeakColor(combinedColors)
        const white =
          outputMode === 'pwm4'
            ? Math.round(Math.max(0, Math.min(1, Math.min(peak.red, peak.green, peak.blue))) * 255)
            : 0
        const pwmFrame: PendingPwmFrame = {
          key: `${fixture.controller.segment_id ?? 'all'}_${outputMode}`,
          segmentId: fixture.controller.segment_id,
          red: Math.round(Math.max(0, Math.min(1, peak.red)) * 255),
          green: Math.round(Math.max(0, Math.min(1, peak.green)) * 255),
          blue: Math.round(Math.max(0, Math.min(1, peak.blue)) * 255),
          white,
        }
        const pending = hostPwmFrames.get(host) ?? []
        pending.push(pwmFrame)
        hostPwmFrames.set(host, pending)
      }

      for (const [host, sparseFrame] of hostPixelSparseFrame.entries()) {
        const entry = this.entriesByHost[host]
        if (entry === undefined) continue
        const ranges = toContiguousRanges(sparseFrame)
        for (const range of ranges) {
          entry.device.broadcast(
            range.colors,
            range.startIndex,
            hostPixelFormat.get(host) ?? 'auto'
          )
          telemetryCounter('wled', 'broadcast_packets')
        }
      }

      const now = Date.now()
      for (const [host, pwmFrames] of hostPwmFrames.entries()) {
        const entry = this.entriesByHost[host]
        if (entry === undefined) continue
        if (now - entry.lastPwmPostedAtMs < 50) {
          continue
        }

        for (const frame of pwmFrames) {
          const signature = `${frame.red},${frame.green},${frame.blue},${frame.white}`
          const previous = entry.lastPwmFramesByKey.get(frame.key)
          if (signature === previous) {
            continue
          }
          entry.lastPwmFramesByKey.set(frame.key, signature)
          void entry.device.setPwmColor(frame.segmentId, {
            red: frame.red,
            green: frame.green,
            blue: frame.blue,
            white: frame.white,
          })
          telemetryCounter('wled', 'pwm_posts')
        }
        entry.lastPwmPostedAtMs = now
      }

      telemetryDuration('wled', 'broadcast_tick_ms', performance.now() - startedAt)
    }, 1000 / 60)
  }

  private updateDevices() {
    const state = this.c.controlState()
    if (state === null) return

    const seenHosts = new Set<string>()

    for (const rawFixture of state.dmx.led.ledFixtures) {
      const fixture = normalizeLedFixtureForRuntime(rawFixture)
      const host = fixture.mdns.trim()
      if (host.length <= 0) {
        continue
      }

      seenHosts.add(host)
      const existing = this.entriesByHost[host]
      if (existing === undefined) {
        telemetryCounter('wled', 'device_added')
        this.entriesByHost[host] = {
          host,
          device: new WledDevice(host),
          lastPwmFramesByKey: new Map<string, string>(),
          lastPwmPostedAtMs: 0,
        }
        continue
      }

      existing.device.refresh()
    }

    for (const [host, entry] of Object.entries(this.entriesByHost)) {
      if (!seenHosts.has(host) && entry !== undefined) {
        telemetryCounter('wled', 'device_removed')
        entry.device.release()
        delete this.entriesByHost[host]
      }
    }
    telemetryGauge('wled', 'active_devices', Object.keys(this.entriesByHost).length)
  }

  release() {
    for (const [_host, entry] of Object.entries(this.entriesByHost)) {
      if (entry !== undefined) {
        entry.device.release()
      }
    }
    this.entriesByHost = {}

    clearInterval(this.pokeInterval)
    clearInterval(this.broadcastInterval)
    telemetryCounter('wled', 'manager_released')
    telemetryHealth('wled', 'warn', 'WLED manager released')
  }
}

function resolveSplitParamsForFixture(
  fixtureGroups: string[],
  splitScenes: SplitScene_t[],
  splitStates: Array<{ outputParams: Params } | undefined>
): Params[] {
  if (splitScenes.length === 0 || splitStates.length === 0) {
    return []
  }

  const matches: Params[] = []
  for (let i = 0; i < splitScenes.length; i++) {
    if (!fixtureGroupsMatchSceneGroups(fixtureGroups, splitScenes[i].groups)) {
      continue
    }
    const params = splitStates[i]?.outputParams
    if (params !== undefined) {
      matches.push(params)
    }
  }

  if (matches.length > 0) {
    return matches
  }

  const fallback = splitStates[0]?.outputParams
  return fallback !== undefined ? [fallback] : []
}

function combineLedLayers(layers: BaseColors[][]): BaseColors[] {
  if (layers.length === 0) {
    return []
  }

  const pixelCount = layers.reduce((maxCount, layer) => {
    return Math.max(maxCount, layer.length)
  }, 0)
  const merged: BaseColors[] = Array.from({ length: pixelCount }, () => ({
    red: 0,
    green: 0,
    blue: 0,
  }))

  for (const layer of layers) {
    for (let pixelIndex = 0; pixelIndex < layer.length; pixelIndex++) {
      const source = layer[pixelIndex]
      const current = merged[pixelIndex]
      if (source === undefined || current === undefined) continue
      current.red = Math.max(current.red, source.red)
      current.green = Math.max(current.green, source.green)
      current.blue = Math.max(current.blue, source.blue)
    }
  }

  return merged
}

function getPeakColor(colors: BaseColors[]): BaseColors {
  const peak = { red: 0, green: 0, blue: 0 }
  for (const color of colors) {
    peak.red = Math.max(peak.red, color.red)
    peak.green = Math.max(peak.green, color.green)
    peak.blue = Math.max(peak.blue, color.blue)
  }
  return peak
}

function toContiguousRanges(
  sparseFrame: Map<number, BaseColors>
): Array<{ startIndex: number; colors: BaseColors[] }> {
  if (sparseFrame.size <= 0) {
    return []
  }

  const indexes = Array.from(sparseFrame.keys()).sort((a, b) => a - b)
  const firstIndex = indexes[0]
  if (firstIndex === undefined) {
    return []
  }
  const ranges: Array<{ startIndex: number; colors: BaseColors[] }> = []
  let currentStart = firstIndex
  let currentColors: BaseColors[] = []
  let lastIndex = firstIndex - 1

  for (const index of indexes) {
    const color = sparseFrame.get(index)
    if (color === undefined) continue

    if (currentColors.length > 0 && index !== lastIndex + 1) {
      ranges.push({
        startIndex: currentStart,
        colors: currentColors,
      })
      currentStart = index
      currentColors = []
    }

    currentColors.push(color)
    lastIndex = index
  }

  if (currentColors.length > 0) {
    ranges.push({
      startIndex: currentStart,
      colors: currentColors,
    })
  }

  return ranges
}
