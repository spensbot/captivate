export interface WledDiscoveredController {
  host: string
  ip: string | null
  name: string
}

export type WledOutputMode = 'auto' | 'pixel' | 'pwm3' | 'pwm4'

export interface WledControllerSegmentInfo {
  id: number
  name: string
  start: number
  stop: number
  length: number
  active: boolean
}

export interface WledControllerBusInfo {
  index: number
  type: string
  start: number
  length: number
  channels: number
  isPixel: boolean
  isAnalogPwm: boolean
}

export interface WledControllerCapabilities {
  host: string
  ip: string | null
  reachable: boolean
  firmware: string | null
  ledCount: number
  maxSegments: number
  supportsRealtimeUdp: boolean
  supportsPixel: boolean
  supportsPixelRgb: boolean
  supportsPixelRgbw: boolean
  supportsPwm3: boolean
  supportsPwm4: boolean
  defaultOutputMode: WledOutputMode
  segments: WledControllerSegmentInfo[]
  buses: WledControllerBusInfo[]
  warnings: string[]
}

export type WledPixelRoutingSource = 'segment' | 'controller' | 'manual'

export function findWledSegment(
  capabilities: WledControllerCapabilities | null,
  segmentId: number | null
): WledControllerSegmentInfo | null {
  if (capabilities === null || segmentId === null) {
    return null
  }
  return capabilities.segments.find((segment) => segment.id === segmentId) ?? null
}

/** Pixel stream bounds from WLED segment list or controller LED count when probed. */
export function resolveWledPixelRouting(
  segmentId: number | null,
  pixelStart: number,
  pixelCount: number | null,
  capabilities: WledControllerCapabilities | null
): {
  pixel_start: number
  pixel_count: number | null
  source: WledPixelRoutingSource
} {
  const segment = findWledSegment(capabilities, segmentId)
  if (segment !== null && segment.length > 0) {
    return {
      pixel_start: segment.start,
      pixel_count: segment.length,
      source: 'segment',
    }
  }

  if (
    segmentId === null &&
    capabilities !== null &&
    capabilities.reachable &&
    capabilities.ledCount > 0
  ) {
    return {
      pixel_start: pixelStart,
      pixel_count: capabilities.ledCount,
      source: 'controller',
    }
  }

  return {
    pixel_start: pixelStart,
    pixel_count: pixelCount,
    source: 'manual',
  }
}

export function wledPixelRoutingFieldsVisible(
  effectiveOutputMode: WledOutputMode,
  routingSource: WledPixelRoutingSource
): { showPixelStart: boolean; showPixelLimit: boolean } {
  if (effectiveOutputMode !== 'pixel') {
    return { showPixelStart: false, showPixelLimit: false }
  }
  if (routingSource === 'segment') {
    return { showPixelStart: false, showPixelLimit: false }
  }
  if (routingSource === 'controller') {
    return { showPixelStart: true, showPixelLimit: false }
  }
  return { showPixelStart: true, showPixelLimit: true }
}
