import { BaseColors } from '../../../shared/baseColors'

const MAX_VAL = 255
const TIMEOUT_SECONDS = 2
const DRGB_MAX_LEDS = 490
const DRGBW_MAX_LEDS = 367
const DNRGB_MAX_LEDS = 489

export type WledPixelTransportFormat = 'rgb' | 'rgbw' | 'auto'

export function buildWledUdpPackets(
  colors: BaseColors[],
  startIndex = 0,
  format: WledPixelTransportFormat = 'auto'
): Buffer[] {
  const safeStartIndex = Math.max(0, Math.round(startIndex))
  const safeFormat = format === 'rgb' || format === 'rgbw' ? format : 'rgbw'
  return safeFormat === 'rgbw'
    ? buildRgbwPackets(colors, safeStartIndex)
    : buildRgbPackets(colors, safeStartIndex)
}

function buildRgbPackets(colors: BaseColors[], startIndex: number): Buffer[] {
  if (colors.length <= 0) {
    return []
  }

  if (startIndex === 0 && colors.length <= DRGB_MAX_LEDS) {
    const buffer = Buffer.alloc(colors.length * 3 + 2, 0)
    buffer[0] = 2 // DRGB
    buffer[1] = TIMEOUT_SECONDS
    for (let i = 0; i < colors.length; i++) {
      const color = colors[i]
      const offset = 2 + i * 3
      buffer[offset + 0] = toByte(color.red)
      buffer[offset + 1] = toByte(color.green)
      buffer[offset + 2] = toByte(color.blue)
    }
    return [buffer]
  }

  const packets: Buffer[] = []
  for (let i = 0; i < colors.length; i += DNRGB_MAX_LEDS) {
    const chunk = colors.slice(i, i + DNRGB_MAX_LEDS)
    const packetStart = startIndex + i
    const buffer = Buffer.alloc(chunk.length * 3 + 4, 0)
    buffer[0] = 4 // DNRGB
    buffer[1] = TIMEOUT_SECONDS
    buffer[2] = (packetStart >> 8) & 0xff
    buffer[3] = packetStart & 0xff
    for (let ci = 0; ci < chunk.length; ci++) {
      const color = chunk[ci]
      const offset = 4 + ci * 3
      buffer[offset + 0] = toByte(color.red)
      buffer[offset + 1] = toByte(color.green)
      buffer[offset + 2] = toByte(color.blue)
    }
    packets.push(buffer)
  }
  return packets
}

function buildRgbwPackets(colors: BaseColors[], startIndex: number): Buffer[] {
  if (colors.length <= 0) {
    return []
  }

  if (startIndex === 0 && colors.length <= DRGBW_MAX_LEDS) {
    const buffer = Buffer.alloc(colors.length * 4 + 2, 0)
    buffer[0] = 3 // DRGBW
    buffer[1] = TIMEOUT_SECONDS
    for (let i = 0; i < colors.length; i++) {
      const color = colors[i]
      const white = Math.min(color.red, color.green, color.blue)
      const offset = 2 + i * 4
      buffer[offset + 0] = toByte(color.red)
      buffer[offset + 1] = toByte(color.green)
      buffer[offset + 2] = toByte(color.blue)
      buffer[offset + 3] = toByte(white)
    }
    return [buffer]
  }
  // Official WLED docs expose DNRGB (type 4) for indexed multi-packet updates,
  // but do not define an indexed DNRGBW variant. For large/indexed transfers,
  // fall back to RGB transport for protocol compatibility.
  return buildRgbPackets(colors, startIndex)
}

function toByte(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(255, Math.round(value * MAX_VAL)))
}
