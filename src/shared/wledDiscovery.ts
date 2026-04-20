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
