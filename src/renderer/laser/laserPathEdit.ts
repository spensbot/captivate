import type { LaserShapeLayer, NormPoint } from './laserEditorTypes'
import {
  insertSplinePointNear,
  removeSplineAnchorAt,
  splineAnchorIndices,
} from './laserEditorSpline'

const H = 0.022

function dist(a: NormPoint, b: NormPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function findClosestVertexIndex(
  points: NormPoint[],
  click: NormPoint,
  maxDist = H
): number | null {
  let best: number | null = null
  let bd = maxDist
  for (let i = 0; i < points.length; i++) {
    const d = dist(points[i], click)
    if (d < bd) {
      bd = d
      best = i
    }
  }
  return best
}

/** Insert a vertex on the closest edge of a polyline (open). */
export function insertVertexInOpenPolyline(
  points: NormPoint[],
  click: NormPoint
): NormPoint[] | null {
  if (points.length < 2) return null
  let bestI = 0
  let bestD = 1e9
  let bestT = 0.5
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const abx = b.x - a.x
    const aby = b.y - a.y
    const apx = click.x - a.x
    const apy = click.y - a.y
    const abLenSq = abx * abx + aby * aby
    let t = 0.5
    if (abLenSq > 1e-14) {
      t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq))
    }
    const cx = a.x + t * abx
    const cy = a.y + t * aby
    const d = Math.hypot(click.x - cx, click.y - cy)
    if (d < bestD) {
      bestD = d
      bestI = i
      bestT = t
    }
  }
  if (bestD > H * 1.5) return null
  const a = points[bestI]
  const b = points[bestI + 1]
  const q = {
    x: a.x + (b.x - a.x) * bestT,
    y: a.y + (b.y - a.y) * bestT,
  }
  const next = [...points.slice(0, bestI + 1), q, ...points.slice(bestI + 1)]
  return next
}

export function insertVertexInClosedPoly(
  points: NormPoint[],
  click: NormPoint
): NormPoint[] | null {
  if (points.length < 3) return null
  let bestI = 0
  let bestD = 1e9
  let bestT = 0.5
  const n = points.length
  for (let i = 0; i < n; i++) {
    const a = points[i]
    const b = points[(i + 1) % n]
    const abx = b.x - a.x
    const aby = b.y - a.y
    const apx = click.x - a.x
    const apy = click.y - a.y
    const abLenSq = abx * abx + aby * aby
    let t = 0.5
    if (abLenSq > 1e-14) {
      t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq))
    }
    const cx = a.x + t * abx
    const cy = a.y + t * aby
    const d = Math.hypot(click.x - cx, click.y - cy)
    if (d < bestD) {
      bestD = d
      bestI = i
      bestT = t
    }
  }
  if (bestD > H * 1.5) return null
  const a = points[bestI]
  const b = points[(bestI + 1) % n]
  const q = {
    x: a.x + (b.x - a.x) * bestT,
    y: a.y + (b.y - a.y) * bestT,
  }
  return [...points.slice(0, bestI + 1), q, ...points.slice(bestI + 1)]
}

export function insertVertexInLayer(
  layer: LaserShapeLayer,
  click: NormPoint
): LaserShapeLayer | null {
  if (layer.kind === 'poly') {
    const next = insertVertexInClosedPoly(layer.points, click)
    return next ? { ...layer, points: next } : null
  }
  if (layer.kind === 'freehand') {
    const next = insertVertexInOpenPolyline(layer.points, click)
    return next ? { ...layer, points: next } : null
  }
  if (layer.kind === 'spline') {
    const next = insertSplinePointNear(layer.points, click)
    return next ? { ...layer, points: next } : null
  }
  return null
}

export function removeVertexFromLayer(
  layer: LaserShapeLayer,
  vertexIndex: number
): LaserShapeLayer | null {
  const pts = layer.points
  if (layer.kind === 'poly') {
    if (pts.length <= 3) return null
    if (vertexIndex < 0 || vertexIndex >= pts.length) return null
    const next = pts.filter((_, i) => i !== vertexIndex)
    return { ...layer, points: next }
  }
  if (layer.kind === 'freehand') {
    if (pts.length <= 2) return null
    if (vertexIndex < 0 || vertexIndex >= pts.length) return null
    return { ...layer, points: pts.filter((_, i) => i !== vertexIndex) }
  }
  if (layer.kind === 'spline') {
    const anchors = splineAnchorIndices(pts)
    if (!anchors.includes(vertexIndex)) return null
    const next = removeSplineAnchorAt(pts, vertexIndex)
    return next ? { ...layer, points: next } : null
  }
  return null
}
