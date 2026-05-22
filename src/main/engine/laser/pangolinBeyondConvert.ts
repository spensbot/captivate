import type { LaserDacFramePoint } from '../../../shared/laserDac'

/** BEYOND SDK coordinate range (-32K … +32K). */
export const BEYOND_COORD_RESOLUTION = 32000

export type BeyondSdkPoint = {
  x: number
  y: number
  z: number
  pointColor: number
  repCount: number
  focus: number
  status: number
  zero: number
}

export function captivateToBeyondPoint(p: LaserDacFramePoint): BeyondSdkPoint {
  const blank = p.blank === true
  const x01 = Math.max(0, Math.min(1, p.x))
  const y01 = Math.max(0, Math.min(1, p.y))
  const x = (x01 - 0.5) * 2 * BEYOND_COORD_RESOLUTION
  const y = (0.5 - y01) * 2 * BEYOND_COORD_RESOLUTION
  const r = blank ? 0 : Math.round(Math.max(0, Math.min(1, p.r)) * 255)
  const g = blank ? 0 : Math.round(Math.max(0, Math.min(1, p.g)) * 255)
  const b = blank ? 0 : Math.round(Math.max(0, Math.min(1, p.b)) * 255)
  const pointColor = (b << 16) | (g << 8) | r
  return {
    x,
    y,
    z: 0,
    pointColor,
    repCount: 0,
    focus: 0,
    status: 0,
    zero: 0,
  }
}

export function captivatePointsToBeyond(
  points: LaserDacFramePoint[]
): BeyondSdkPoint[] {
  const max = Math.min(8192, points.length)
  const out: BeyondSdkPoint[] = []
  for (let i = 0; i < max; i++) {
    out.push(captivateToBeyondPoint(points[i]!))
  }
  return out
}

/** BEYOND zone list: 1-based zone numbers, zero-terminated. */
export function beyondZoneListBuffer(zoneIndex0: number): Buffer {
  const buf = Buffer.alloc(256)
  buf[0] = Math.max(1, Math.min(200, zoneIndex0 + 1))
  buf[1] = 0
  return buf
}
