import type { LaserShapeLayer, NormPoint } from './laserEditorTypes'
import { clampPoint } from './laserEditorGeometry'

const dist = (a: NormPoint, b: NormPoint) => Math.hypot(a.x - b.x, a.y - b.y)

export type VertexHandleRef =
  | { kind: 'line'; i: 0 | 1 }
  | { kind: 'rect'; i: 0 | 1 }
  | { kind: 'circle'; part: 'center' | 'rim' }
  | { kind: 'poly'; i: number }
  | { kind: 'freehand'; i: number }
  | { kind: 'spline'; i: number }

const HIT = 0.024

function freehandHandleIndices(len: number): number[] {
  if (len <= 0) return []
  if (len <= 24) return Array.from({ length: len }, (_, i) => i)
  const step = Math.ceil(len / 24)
  const ix: number[] = []
  for (let i = 0; i < len; i += step) ix.push(i)
  if (ix[ix.length - 1] !== len - 1) ix.push(len - 1)
  return ix
}

export function hitTestVertexHandle(
  p: NormPoint,
  layer: LaserShapeLayer
): VertexHandleRef | null {
  const pts = layer.points
  switch (layer.kind) {
    case 'line':
      if (pts.length >= 2) {
        if (dist(p, pts[1]) <= HIT) return { kind: 'line', i: 1 }
        if (dist(p, pts[0]) <= HIT) return { kind: 'line', i: 0 }
      }
      return null
    case 'rect':
      if (pts.length >= 2) {
        if (dist(p, pts[1]) <= HIT) return { kind: 'rect', i: 1 }
        if (dist(p, pts[0]) <= HIT) return { kind: 'rect', i: 0 }
      }
      return null
    case 'circle':
      if (pts.length >= 2) {
        if (dist(p, pts[1]) <= HIT) return { kind: 'circle', part: 'rim' }
        if (dist(p, pts[0]) <= HIT) return { kind: 'circle', part: 'center' }
      }
      return null
    case 'poly':
      for (let i = pts.length - 1; i >= 0; i--) {
        if (dist(p, pts[i]) <= HIT) return { kind: 'poly', i }
      }
      return null
    case 'freehand':
      for (const i of freehandHandleIndices(pts.length)) {
        if (dist(p, pts[i]) <= HIT) return { kind: 'freehand', i }
      }
      return null
    case 'spline':
      for (let i = pts.length - 1; i >= 0; i--) {
        if (dist(p, pts[i]) <= HIT) return { kind: 'spline', i }
      }
      return null
    default:
      return null
  }
}

export function moveVertexHandle(
  layer: LaserShapeLayer,
  ref: VertexHandleRef,
  np: NormPoint
): LaserShapeLayer {
  const q = clampPoint(np)
  const pts = layer.points.slice()
  switch (ref.kind) {
    case 'line':
    case 'rect':
      pts[ref.i] = q
      return { ...layer, points: pts }
    case 'circle': {
      if (ref.part === 'center') {
        const c0 = layer.points[0]
        const c1 = layer.points[1]
        const dx = q.x - c0.x
        const dy = q.y - c0.y
        return {
          ...layer,
          points: [
            q,
            { x: c1.x + dx, y: c1.y + dy },
          ],
        }
      }
      const c = layer.points[0]
      return { ...layer, points: [c, q] }
    }
    case 'poly':
    case 'freehand':
    case 'spline':
      pts[ref.i] = q
      return { ...layer, points: pts }
    default:
      return layer
  }
}

export function handleCentersForRender(layer: LaserShapeLayer): NormPoint[] {
  const pts = layer.points
  switch (layer.kind) {
    case 'line':
    case 'rect':
      return pts.length >= 2 ? [pts[0], pts[1]] : []
    case 'circle':
      return pts.length >= 2 ? [pts[0], pts[1]] : []
    case 'poly':
      return pts.slice()
    case 'freehand':
      return freehandHandleIndices(pts.length).map((i) => pts[i])
    case 'spline':
      return pts.slice()
    default:
      return []
  }
}
