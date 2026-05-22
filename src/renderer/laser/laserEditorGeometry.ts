import type { LaserShapeLayer, NormPoint } from './laserEditorTypes'
import { distancePointToSpline } from './laserEditorSpline'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export function clampPoint(p: NormPoint): NormPoint {
  return { x: clamp01(p.x), y: clamp01(p.y) }
}

/** Snap both axes to a uniform grid in normalized 0–1 space; `step <= 0` skips snapping. */
export function snapNormPoint(p: NormPoint, step: number): NormPoint {
  if (!Number.isFinite(step) || step <= 0) {
    return clampPoint(p)
  }
  const x = Math.round(p.x / step) * step
  const y = Math.round(p.y / step) * step
  return clampPoint({ x, y })
}

function distSq(a: NormPoint, b: NormPoint): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

function distPointSegment(p: NormPoint, a: NormPoint, b: NormPoint): number {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const apx = p.x - a.x
  const apy = p.y - a.y
  const abLenSq = abx * abx + aby * aby
  if (abLenSq < 1e-12) return Math.sqrt(distSq(p, a))
  let t = (apx * abx + apy * aby) / abLenSq
  t = Math.max(0, Math.min(1, t))
  const cx = a.x + t * abx
  const cy = a.y + t * aby
  return Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2)
}

function pointInPoly(p: NormPoint, pts: NormPoint[]): boolean {
  if (pts.length < 3) return false
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x
    const yi = pts[i].y
    const xj = pts[j].x
    const yj = pts[j].y
    const intersect =
      yi > p.y !== yj > p.y &&
      p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-12) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function layerEdgeDistance(layer: LaserShapeLayer, p: NormPoint): number {
  const pts = layer.points
  if (pts.length < 2) return 1e9
  let d = 1e9
  switch (layer.kind) {
    case 'line':
    case 'freehand': {
      for (let i = 0; i < pts.length - 1; i++) {
        d = Math.min(d, distPointSegment(p, pts[i], pts[i + 1]))
      }
      return d
    }
    case 'rect': {
      if (pts.length < 2) return 1e9
      const x0 = Math.min(pts[0].x, pts[1].x)
      const x1 = Math.max(pts[0].x, pts[1].x)
      const y0 = Math.min(pts[0].y, pts[1].y)
      const y1 = Math.max(pts[0].y, pts[1].y)
      const inside = p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1
      if (inside) {
        const dx = Math.min(p.x - x0, x1 - p.x)
        const dy = Math.min(p.y - y0, y1 - p.y)
        return Math.min(dx, dy)
      }
      // Outside: distance to expanded rect boundary
      const cx = clamp01(p.x)
      const cy = clamp01(p.y)
      const nx = Math.max(x0, Math.min(x1, cx))
      const ny = Math.max(y0, Math.min(y1, cy))
      return Math.sqrt((p.x - nx) ** 2 + (p.y - ny) ** 2)
    }
    case 'circle': {
      if (pts.length < 2) return 1e9
      const c = pts[0]
      const r = Math.sqrt(distSq(c, pts[1]))
      const dc = Math.sqrt(distSq(p, c))
      return Math.abs(dc - r)
    }
    case 'poly': {
      if (pts.length < 3) return 1e9
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length
        d = Math.min(d, distPointSegment(p, pts[i], pts[j]))
      }
      return d
    }
    case 'spline':
      return distancePointToSpline(p, pts)
    case 'text': {
      if (pts.length < 2) return 1e9
      const x0 = Math.min(pts[0].x, pts[1].x)
      const x1 = Math.max(pts[0].x, pts[1].x)
      const y0 = Math.min(pts[0].y, pts[1].y)
      const y1 = Math.max(pts[0].y, pts[1].y)
      const inside = p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1
      if (inside) {
        const dx = Math.min(p.x - x0, x1 - p.x)
        const dy = Math.min(p.y - y0, y1 - p.y)
        return Math.min(dx, dy)
      }
      const cx = clamp01(p.x)
      const cy = clamp01(p.y)
      const nx = Math.max(x0, Math.min(x1, cx))
      const ny = Math.max(y0, Math.min(y1, cy))
      return Math.sqrt((p.x - nx) ** 2 + (p.y - ny) ** 2)
    }
    default:
      return 1e9
  }
}

/** Pick topmost (last) layer within tolerance in normalized space. */
export function pickLayerAt(
  layers: LaserShapeLayer[],
  p: NormPoint,
  tolerance = 0.018
): LaserShapeLayer | null {
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i]
    const d = layerEdgeDistance(layer, p)
    if (d <= tolerance) return layer
    if (layer.kind === 'rect' || layer.kind === 'poly' || layer.kind === 'text') {
      const pts = layer.points
      if (
        (layer.kind === 'rect' || layer.kind === 'text') &&
        pts.length >= 2 &&
        p.x >= Math.min(pts[0].x, pts[1].x) - tolerance &&
        p.x <= Math.max(pts[0].x, pts[1].x) + tolerance &&
        p.y >= Math.min(pts[0].y, pts[1].y) - tolerance &&
        p.y <= Math.max(pts[0].y, pts[1].y) + tolerance
      ) {
        return layer
      }
      if (layer.kind === 'poly' && pts.length >= 3 && pointInPoly(p, pts)) {
        return layer
      }
    }
  }
  return null
}
