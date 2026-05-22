import http from 'node:http'
import type {
  WledControllerBusInfo,
  WledControllerCapabilities,
  WledControllerSegmentInfo,
  WledOutputMode,
} from '../../../shared/wledDiscovery'

const REQUEST_TIMEOUT_MS = 2000

type JsonRecord = Record<string, unknown>

export async function probeWledControllerCapabilities(
  hostInput: string
): Promise<WledControllerCapabilities> {
  const host = normalizeHost(hostInput)
  if (host.length === 0) {
    return initProbeResult('', null, ['Missing host/IP for WLED controller.'])
  }

  const info = await requestWledJson(host, '/json/info')
  const state = await requestWledJson(host, '/json/state')
  let cfg = await requestWledJson(host, '/json/cfg')
  const ip = readInfoIp(info)
  if (cfg === null && ip !== null && ip !== host) {
    cfg = await requestWledJson(ip, '/json/cfg')
  }

  if (info === null && state === null && cfg === null) {
    return initProbeResult(host, null, [
      'Controller is unreachable or did not respond to WLED JSON endpoints.',
    ])
  }

  const ledInfo = asRecord(info?.leds)
  const ledCfg = parseLedConfig(cfg)
  const buses = parseBusInfo(ledCfg)
  const segments = parseSegments(state)

  const infoLedCount = toInt(ledInfo?.count, 0)
  const segmentLedSpan = segments.reduce(
    (max, segment) => Math.max(max, segment.stop, segment.start + segment.length),
    0
  )
  const supportsPixel =
    infoLedCount > 0 ||
    segmentLedSpan > 0 ||
    buses.some((bus) => bus.isPixel && bus.length > 0)
  const supportsPixelRgbw =
    supportsPixel &&
    (readTruthyBoolean(ledInfo?.rgbw) || readTruthyBoolean(ledInfo?.w))
  const supportsPixelRgb = supportsPixel
  const supportsPwm3 = buses.some(
    (bus) => bus.isAnalogPwm && bus.channels === 3
  )
  const supportsPwm4 = buses.some(
    (bus) => bus.isAnalogPwm && bus.channels >= 4
  )

  const maxSegmentsInfo = toInt(ledInfo?.maxseg, 0)
  const maxSegments = Math.max(
    segments.length,
    maxSegmentsInfo,
    supportsPixel || supportsPwm3 || supportsPwm4 ? 1 : 0
  )

  const warnings: string[] = []
  if (!supportsPixel && !supportsPwm3 && !supportsPwm4) {
    warnings.push(
      'WLED output type could not be identified. Defaulting to pixel streaming.'
    )
  }
  const pixelInferredFromBusesOnly =
    supportsPixel &&
    infoLedCount <= 0 &&
    segmentLedSpan <= 0 &&
    buses.some((bus) => bus.isPixel && bus.length > 0)
  if (pixelInferredFromBusesOnly) {
    warnings.push('Pixel output inferred from bus config; reported LED count is zero.')
  }

  const defaultOutputMode = resolveDefaultOutputMode({
    supportsPixel,
    supportsPwm3,
    supportsPwm4,
  })

  const firmware = readFirmware(info)
  const supportsRealtimeUdp = supportsPixel

  return {
    host,
    ip,
    reachable: true,
    firmware,
    ledCount: Math.max(
      infoLedCount,
      segmentLedSpan,
      ...buses.filter((bus) => bus.isPixel).map((bus) => bus.start + bus.length),
      0
    ),
    maxSegments,
    supportsRealtimeUdp,
    supportsPixel,
    supportsPixelRgb,
    supportsPixelRgbw: Boolean(supportsPixelRgbw),
    supportsPwm3,
    supportsPwm4,
    defaultOutputMode,
    segments,
    buses,
    warnings,
  }
}

function initProbeResult(
  host: string,
  ip: string | null,
  warnings: string[]
): WledControllerCapabilities {
  return {
    host,
    ip,
    reachable: false,
    firmware: null,
    ledCount: 0,
    maxSegments: 0,
    supportsRealtimeUdp: false,
    supportsPixel: false,
    supportsPixelRgb: false,
    supportsPixelRgbw: false,
    supportsPwm3: false,
    supportsPwm4: false,
    defaultOutputMode: 'auto',
    segments: [],
    buses: [],
    warnings,
  }
}

function resolveDefaultOutputMode(input: {
  supportsPixel: boolean
  supportsPwm3: boolean
  supportsPwm4: boolean
}): WledOutputMode {
  if (input.supportsPixel) return 'pixel'
  if (input.supportsPwm4) return 'pwm4'
  if (input.supportsPwm3) return 'pwm3'
  return 'auto'
}

function normalizeHost(value: string) {
  const trimmed = value.trim()
  if (trimmed.length <= 0) return ''
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed)
      return parsed.host
    } catch (_error) {
      return trimmed
    }
  }
  return trimmed
}

async function requestWledJson(
  host: string,
  endpoint: string
): Promise<JsonRecord | null> {
  return await new Promise((resolve) => {
    const req = http.request(
      {
        hostname: host,
        port: 80,
        path: endpoint,
        method: 'GET',
        timeout: REQUEST_TIMEOUT_MS,
      },
      (res) => {
        if ((res.statusCode ?? 500) >= 400) {
          res.resume()
          resolve(null)
          return
        }

        const parts: Buffer[] = []
        res.on('data', (chunk: Buffer | string) => {
          parts.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
        res.on('end', () => {
          try {
            const raw = Buffer.concat(parts).toString('utf8')
            const parsed = JSON.parse(raw)
            resolve(asRecord(parsed))
          } catch (_error) {
            resolve(null)
          }
        })
      }
    )

    req.on('error', () => resolve(null))
    req.on('timeout', () => {
      req.destroy()
      resolve(null)
    })
    req.end()
  })
}

function asRecord(value: unknown): JsonRecord | null {
  if (value === null || typeof value !== 'object') {
    return null
  }
  return value as JsonRecord
}

function toInt(value: unknown, fallback: number): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(0, Math.round(numeric))
}

function parseLedConfig(cfg: JsonRecord | null): JsonRecord | null {
  if (cfg === null) {
    return null
  }
  const hw = asRecord(cfg.hw)
  const fromHw = asRecord(hw?.led)
  if (fromHw !== null) {
    return fromHw
  }
  return asRecord(cfg.led)
}

function parseBusInfo(ledCfg: JsonRecord | null): WledControllerBusInfo[] {
  const rawIns = ledCfg?.ins
  const ins = Array.isArray(rawIns) ? rawIns : []
  const buses: WledControllerBusInfo[] = []

  ins.forEach((rawBus, index) => {
    const bus = asRecord(rawBus)
    if (bus === null) return

    const start = toInt(bus.start, 0)
    const length = toInt(bus.len, 0)
    const typeRaw = toInt(bus.type, 0)
    const pins = parsePins(bus.pin)
    const channels =
      pins >= 4 ? 4 : pins >= 3 ? 3 : inferChannelsFromTypeCode(typeRaw)
    const isPixel = length > 1 || !isLikelyAnalogType(typeRaw, channels, length)
    const isAnalogPwm = !isPixel && channels >= 3

    buses.push({
      index,
      type: `${typeRaw}`,
      start,
      length,
      channels,
      isPixel,
      isAnalogPwm,
    })
  })

  return buses
}

function parsePins(rawPins: unknown): number {
  if (Array.isArray(rawPins)) {
    return rawPins.length
  }
  const numeric = Number(rawPins)
  if (!Number.isFinite(numeric)) {
    return 0
  }
  return numeric >= 0 ? 1 : 0
}

function inferChannelsFromTypeCode(typeCode: number): number {
  // Common WLED analog bus variants are 3-channel RGB or 4-channel RGBW.
  if (typeCode === 41 || typeCode === 42 || typeCode === 43 || typeCode === 44) {
    return 4
  }
  if (typeCode === 40) {
    return 3
  }
  return 0
}

function isLikelyAnalogType(
  typeCode: number,
  channels: number,
  length: number
): boolean {
  if (channels >= 3 && length <= 1) {
    return true
  }
  return typeCode >= 40 && typeCode <= 45
}

function parseSegments(state: JsonRecord | null): WledControllerSegmentInfo[] {
  const rawSegments = state?.seg
  const segments = Array.isArray(rawSegments) ? rawSegments : []
  const output: WledControllerSegmentInfo[] = []

  segments.forEach((rawSeg, index) => {
    const seg = asRecord(rawSeg)
    if (seg === null) return

    const id = toInt(seg.id, index)
    const start = toInt(seg.start, 0)
    const lenField = toInt(seg.len, -1)
    const stopField = toInt(seg.stop, -1)
    let stop = start
    let length = 0
    if (lenField > 0) {
      length = lenField
      stop = start + lenField
    } else if (stopField > start) {
      stop = stopField
      length = stopField - start
    } else if (stopField === start && start > 0) {
      stop = stopField
      length = 0
    }
    const active = seg.on !== false
    const nameRaw = typeof seg.n === 'string' ? seg.n.trim() : ''
    output.push({
      id,
      name: nameRaw.length > 0 ? nameRaw : `Segment ${id + 1}`,
      start,
      stop: Math.max(start, stop),
      length,
      active,
    })
  })

  return output.sort((a, b) => a.id - b.id)
}

function readInfoIp(info: JsonRecord | null): string | null {
  const ip = info?.ip
  return typeof ip === 'string' && ip.trim().length > 0 ? ip.trim() : null
}

function readFirmware(info: JsonRecord | null): string | null {
  const ver = info?.ver
  return typeof ver === 'string' && ver.trim().length > 0 ? ver.trim() : null
}

function readTruthyBoolean(value: unknown): boolean {
  if (value === true) return true
  if (typeof value === 'number') return value > 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === 'true' || normalized === '1' || normalized === 'yes'
  }
  return false
}
