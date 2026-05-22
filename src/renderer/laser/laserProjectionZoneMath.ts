import type { LaserDacFramePoint } from '../../shared/laserDac'
import type {
  LaserProjectionZone,
  LaserProjectionZoneRect,
} from '../../shared/laserFixtureRouting'
import { clamp01 } from './laserAnimationPath'

export function normalizeZoneRect(rect: LaserProjectionZoneRect): LaserProjectionZoneRect {
  const w = Math.max(0.02, clamp01(rect.w))
  const h = Math.max(0.02, clamp01(rect.h))
  let x = clamp01(rect.x)
  let y = clamp01(rect.y)
  if (x + w > 1) x = Math.max(0, 1 - w)
  if (y + h > 1) y = Math.max(0, 1 - h)
  return { x, y, w, h }
}

export function pointInZone(
  px: number,
  py: number,
  zone: LaserProjectionZoneRect
): boolean {
  const z = normalizeZoneRect(zone)
  return px >= z.x && px <= z.x + z.w && py >= z.y && py <= z.y + z.h
}

/** Map a canvas-normalized point into zone-local scanner space (0–1). */
export function mapPointToZoneScanner(
  px: number,
  py: number,
  zone: LaserProjectionZoneRect
): { x: number; y: number } | null {
  const z = normalizeZoneRect(zone)
  if (!pointInZone(px, py, z)) return null
  return {
    x: (px - z.x) / z.w,
    y: (py - z.y) / z.h,
  }
}

/**
 * Remap a sampled frame into a projection zone (Quick Show–style zoning on one DAC).
 * Points outside the zone are dropped; blank hops are preserved.
 */
export function applyZoneToFrame(
  points: LaserDacFramePoint[],
  zone: LaserProjectionZone | LaserProjectionZoneRect
): LaserDacFramePoint[] {
  const rect = 'rect' in zone ? zone.rect : zone
  const z = normalizeZoneRect(rect)
  const clip =
    'clipOutside' in zone ? zone.clipOutside !== false : true
  const out: LaserDacFramePoint[] = []
  for (const p of points) {
    if (p.blank) {
      out.push(p)
      continue
    }
    const mapped = mapPointToZoneScanner(p.x, p.y, z)
    if (mapped === null) {
      if (!clip) {
        out.push({ ...p, blank: true })
      }
      continue
    }
    out.push({
      x: mapped.x,
      y: mapped.y,
      r: p.r,
      g: p.g,
      b: p.b,
      blank: false,
    })
  }
  return out
}

/** Concatenate per-zone frames with blank hops (single DAC stream). */
export function mergeZoneFrames(
  frames: LaserDacFramePoint[][]
): LaserDacFramePoint[] {
  const out: LaserDacFramePoint[] = []
  for (const frame of frames) {
    if (frame.length === 0) continue
    if (out.length > 0) {
      const prev = out[out.length - 1]!
      out.push({ x: prev.x, y: prev.y, r: 0, g: 0, b: 0, blank: true })
    }
    out.push(...frame)
  }
  if (out.length >= 2) return out
  if (out.length === 1) return [...out, { ...out[0]!, blank: true }]
  return [
    { x: 0.5, y: 0.5, r: 0, g: 0, b: 0, blank: true },
    { x: 0.5, y: 0.5, r: 0, g: 0, b: 0, blank: true },
  ]
}
