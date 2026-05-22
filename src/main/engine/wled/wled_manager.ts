import { getLedValues, normalizeLedFixtureForRuntime } from '../../../shared/ledFixtures'
import type { BaseColors } from '../../../shared/baseColors'
import type { Params } from '../../../shared/params'
import { SplitScene_t } from '../../../shared/Scenes'
import { ledFixtureMatchesSceneGroups } from '../../../shared/sceneGroups'
import {
  applyLedRandomizerToColors,
  buildLedRandomizerContext,
  pickPrimarySplitLayerForLed,
} from '../../../shared/splitRandomizer'
import { flatten_fixtures } from '../../../shared/dmxUtil'
import { EngineContext } from '../engineContext'
import WledDevice from './wled_device'
import { WledPixelTransportFormat } from './udp_buffer'
import {
  telemetryCounter,
  telemetryDuration,
  telemetryGauge,
  telemetryHealth,
} from '../../telemetry'

type HostPixelSpan = {
  minIndex: number
  maxIndex: number
  colors: Map<number, BaseColors>
  format: WledPixelTransportFormat
}

type HostEntry = {
  host: string
  device: WledDevice
  lastPwmFramesByKey: Map<string, string>
  lastPwmPostedAtMs: number
  lastPixelKeepalive: HostPixelSpan | null
  liveOverrideRequested: boolean
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

      const hostPixelBundles = new Map<string, HostPixelSpan>()
      const hostPwmFrames = new Map<string, PendingPwmFrame[]>()
      const flattenedFixtures = flatten_fixtures(
        state.dmx.universe,
        state.dmx.fixtureTypesByID
      )
      const ledFixtures = state.dmx.led.ledFixtures

      for (const rawFixture of ledFixtures) {
        const fixture = normalizeLedFixtureForRuntime(rawFixture)
        const host = fixture.mdns.trim()
        if (host.length <= 0) {
          continue
        }

        const entry = this.entriesByHost[host]
        if (entry === undefined) {
          continue
        }

        const outputMode =
          fixture.controller.output_mode === 'auto'
            ? 'pixel'
            : fixture.controller.output_mode

        const startIndex = Math.max(0, Math.round(fixture.controller.pixel_start))
        const configuredPixelCount =
          fixture.controller.pixel_count === null
            ? null
            : Math.max(1, Math.round(fixture.controller.pixel_count))

        const splitLayers = resolveSplitLayersForFixture(
          fixture.groups,
          splitScenes,
          rtState.splitStates
        )

        if (outputMode === 'pixel') {
          const bundle = hostPixelBundles.get(host) ?? createEmptyHostPixelSpan()
          const requestedFormat = (() => {
            const mode = fixture.controller.pixel_format
            if (mode === 'rgb' || mode === 'rgbw') return mode
            return 'rgbw'
          })()
          if (requestedFormat === 'rgbw') {
            bundle.format = 'rgbw'
          } else if (bundle.format !== 'rgbw') {
            bundle.format = requestedFormat
          }

          if (configuredPixelCount !== null) {
            extendHostPixelSpan(bundle, startIndex, configuredPixelCount)
          }

          if (splitLayers.length > 0) {
            const placementDepth2DOnly = state.gui.fxtrDepthOn !== true
            const layers = splitLayers.map(({ params }) =>
              getLedValues(
                params,
                fixture,
                state.control.master,
                placementDepth2DOnly
              )
            )
            let combinedColors = combineLedLayers(layers)
            const primaryLayer = pickPrimarySplitLayerForLed(
              splitLayers,
              splitScenes
            )
            if (primaryLayer !== null && combinedColors.length > 0) {
              const randomizerContext = buildLedRandomizerContext(
                rtState.splitStates[primaryLayer.splitIndex],
                splitScenes[primaryLayer.splitIndex],
                ledFixtures,
                flattenedFixtures,
                fixture.id
              )
              if (randomizerContext !== null) {
                combinedColors = applyLedRandomizerToColors(
                  combinedColors,
                  randomizerContext.state,
                  randomizerContext.baseIndex,
                  randomizerContext.randomize
                )
              }
            }
            if (combinedColors.length > 0) {
              const requestedPixelCount =
                configuredPixelCount ?? combinedColors.length
              const frameLength = Math.min(requestedPixelCount, combinedColors.length)
              extendHostPixelSpan(bundle, startIndex, frameLength)

              for (let i = 0; i < frameLength; i++) {
                const targetIndex = startIndex + i
                if (targetIndex < 0) continue
                const source = combinedColors[i]
                if (source === undefined) continue
                const current = bundle.colors.get(targetIndex) ?? {
                  red: 0,
                  green: 0,
                  blue: 0,
                }
                current.red = Math.max(current.red, source.red)
                current.green = Math.max(current.green, source.green)
                current.blue = Math.max(current.blue, source.blue)
                bundle.colors.set(targetIndex, current)
              }
            }
          }

          hostPixelBundles.set(host, bundle)
          continue
        }

        if (splitLayers.length === 0) {
          continue
        }

        const placementDepth2DOnly = state.gui.fxtrDepthOn !== true
        const layers = splitLayers.map(({ params }) =>
          getLedValues(params, fixture, state.control.master, placementDepth2DOnly)
        )
        const combinedColors = combineLedLayers(layers)
        if (combinedColors.length <= 0) {
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

      for (const [host, bundle] of hostPixelBundles.entries()) {
        const entry = this.entriesByHost[host]
        if (entry === undefined) continue

        const activeSpan = normalizeHostPixelSpan(bundle)
        const spanToSend =
          activeSpan ??
          (entry.lastPixelKeepalive !== null
            ? normalizeHostPixelSpan(entry.lastPixelKeepalive)
            : null)
        if (spanToSend === null) {
          continue
        }

        const denseColors = buildDensePixelFrame(spanToSend)
        if (denseColors.length <= 0) {
          continue
        }

        entry.device.broadcast(denseColors, spanToSend.minIndex, spanToSend.format)
        entry.lastPixelKeepalive = {
          minIndex: spanToSend.minIndex,
          maxIndex: spanToSend.maxIndex,
          colors: new Map(spanToSend.colors),
          format: spanToSend.format,
        }
        telemetryCounter('wled', 'broadcast_packets')
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

  private requestLiveOverride(entry: HostEntry) {
    if (entry.liveOverrideRequested) {
      return
    }
    entry.liveOverrideRequested = true
    void entry.device.enableLiveOverride()
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
        const device = new WledDevice(host)
        const entry: HostEntry = {
          host,
          device,
          lastPwmFramesByKey: new Map<string, string>(),
          lastPwmPostedAtMs: 0,
          lastPixelKeepalive: null,
          liveOverrideRequested: false,
        }
        this.entriesByHost[host] = entry
        void this.requestLiveOverride(entry)
        continue
      }

      existing.device.refresh()
      void this.requestLiveOverride(existing)
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

type SplitLayer = {
  splitIndex: number
  params: Params
}

function resolveSplitLayersForFixture(
  fixtureGroups: string[],
  splitScenes: SplitScene_t[],
  splitStates: Array<{ outputParams: Params } | undefined>
): SplitLayer[] {
  if (splitScenes.length === 0 || splitStates.length === 0) {
    return []
  }

  const matches: SplitLayer[] = []
  for (let i = 0; i < splitScenes.length; i++) {
    if (!ledFixtureMatchesSceneGroups(fixtureGroups, splitScenes[i].groups)) {
      continue
    }
    const params = splitStates[i]?.outputParams
    if (params !== undefined) {
      matches.push({ splitIndex: i, params })
    }
  }

  if (matches.length > 0) {
    return matches
  }

  const fallback = splitStates[0]?.outputParams
  return fallback !== undefined ? [{ splitIndex: 0, params: fallback }] : []
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

function createEmptyHostPixelSpan(): HostPixelSpan {
  return {
    minIndex: Number.POSITIVE_INFINITY,
    maxIndex: Number.NEGATIVE_INFINITY,
    colors: new Map<number, BaseColors>(),
    format: 'rgbw',
  }
}

function extendHostPixelSpan(
  bundle: HostPixelSpan,
  startIndex: number,
  pixelCount: number
) {
  if (pixelCount <= 0) return
  bundle.minIndex = Math.min(bundle.minIndex, startIndex)
  bundle.maxIndex = Math.max(bundle.maxIndex, startIndex + pixelCount - 1)
}

function normalizeHostPixelSpan(bundle: HostPixelSpan): HostPixelSpan | null {
  if (
    !Number.isFinite(bundle.minIndex) ||
    !Number.isFinite(bundle.maxIndex) ||
    bundle.maxIndex < bundle.minIndex
  ) {
    return null
  }
  return bundle
}

function buildDensePixelFrame(bundle: HostPixelSpan): BaseColors[] {
  const length = bundle.maxIndex - bundle.minIndex + 1
  if (length <= 0) {
    return []
  }

  const dense: BaseColors[] = Array.from({ length }, () => ({
    red: 0,
    green: 0,
    blue: 0,
  }))

  for (let i = 0; i < length; i++) {
    const index = bundle.minIndex + i
    const color = bundle.colors.get(index)
    if (color !== undefined) {
      dense[i] = color
    }
  }

  return dense
}
