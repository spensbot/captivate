import type { LaserShapeLayer, NormPoint } from './laserEditorTypes'
import { clampPoint } from './laserEditorGeometry'

export function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(1, v))
}

function segmentLen(a: NormPoint, b: NormPoint): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.hypot(dx, dy) || 1e-9
}

export function polylineTotalLength(pts: NormPoint[]): number {
  if (pts.length < 2) return 0
  let t = 0
  for (let i = 0; i < pts.length - 1; i++) {
    t += segmentLen(pts[i]!, pts[i + 1]!)
  }
  return t
}

/** Arc-length parameter `t01` along polyline → point in normalized editor space. */
export function samplePathAt(pts: NormPoint[], t01: number): NormPoint | null {
  if (pts.length < 2) return null
  const t = clamp01(t01)
  const total = polylineTotalLength(pts)
  if (total <= 0) return { ...pts[0]! }
  let dist = t * total
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!
    const b = pts[i + 1]!
    const len = segmentLen(a, b)
    if (dist <= len || i === pts.length - 2) {
      const u = len > 0 ? Math.min(1, dist / len) : 0
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }
    }
    dist -= len
  }
  return { ...pts[pts.length - 1]! }
}

/** Additive hue phase from motion path (0 when path is too short). */
export function pathHueOffset01(
  pts: NormPoint[] | undefined,
  t01: number,
  weight = 0.38
): number {
  if (!pts || pts.length < 2) return 0
  const p = samplePathAt(pts, t01)
  if (!p) return 0
  const mix = ((p.x * 0.62 + p.y * 0.38) % 1 + 1) % 1
  return mix * weight
}

/** Translation from motion path start → point at `progress01` (for sliding shapes in the preview). */
export function motionPathDisplacement01(
  path: NormPoint[] | undefined,
  progress01: number
): NormPoint {
  if (!path || path.length < 2) return { x: 0, y: 0 }
  const p0 = samplePathAt(path, 0)
  const p1 = samplePathAt(path, clamp01(progress01))
  if (!p0 || !p1) return { x: 0, y: 0 }
  return { x: p1.x - p0.x, y: p1.y - p0.y }
}

/** Editor preview: shift all stored points by delta (clamped to 0–1). */
export function shiftShapeLayerPoints(
  layer: LaserShapeLayer,
  delta: NormPoint
): LaserShapeLayer {
  if (!delta.x && !delta.y) return layer
  return {
    ...layer,
    points: layer.points.map((p) =>
      clampPoint({ x: p.x + delta.x, y: p.y + delta.y })
    ),
  }
}

export const DEFAULT_LASER_ANIMATION_PATH: NormPoint[] = [
  { x: 0.12, y: 0.5 },
  { x: 0.88, y: 0.5 },
]
