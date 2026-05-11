import type { ReactNode } from 'react'
import type {
  LaserRgbCapabilities,
  LaserShapeLayer,
  NormPoint,
} from './laserEditorTypes'
import {
  gateHexForLaser,
  sampleGradientHex,
  sampleRainbowHex,
} from './laserBeamColor'
import { sampleSplinePolyline } from './laserEditorSpline'

export interface LayerStrokeSeg {
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
}

function polylineToSegs(pts: NormPoint[], color: string): LayerStrokeSeg[] {
  const out: LayerStrokeSeg[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    out.push({
      x1: pts[i].x,
      y1: pts[i].y,
      x2: pts[i + 1].x,
      y2: pts[i + 1].y,
      color,
    })
  }
  return out
}

function layerPolylinePoints(layer: LaserShapeLayer): NormPoint[] | null {
  const { kind, points } = layer
  if (kind === 'spline') {
    const s = sampleSplinePolyline(points, 14)
    return s.length >= 2 ? s : null
  }
  if (kind === 'freehand' && points.length >= 2) return points
  if (kind === 'line' && points.length >= 2) return points
  return null
}

function strokeColorAt(
  layer: LaserShapeLayer,
  tAlong: number,
  caps: LaserRgbCapabilities
): string {
  if (layer.beam?.kind === 'gradient') {
    return sampleGradientHex(layer.beam.stops, tAlong, caps)
  }
  if (layer.beam?.kind === 'rainbow') {
    return sampleRainbowHex(tAlong, layer.beam.cycles, caps)
  }
  return gateHexForLaser(layer.color, caps)
}

export function layerStrokeSegments(
  layer: LaserShapeLayer,
  caps: LaserRgbCapabilities,
  samplesAlong = 20
): LayerStrokeSeg[] {
  const { kind, points } = layer

  if (kind === 'rect' && points.length >= 2) {
    const x0 = Math.min(points[0].x, points[1].x)
    const y0 = Math.min(points[0].y, points[1].y)
    const x1 = Math.max(points[0].x, points[1].x)
    const y1 = Math.max(points[0].y, points[1].y)
    const r: NormPoint[] = [
      { x: x0, y: y0 },
      { x: x1, y: y0 },
      { x: x1, y: y1 },
      { x: x0, y: y1 },
      { x: x0, y: y0 },
    ]
    return colorAlongPolyline(r, layer, caps, samplesAlong)
  }
  if (kind === 'circle' && points.length >= 2) {
    const cx = points[0].x
    const cy = points[0].y
    const rad = Math.hypot(points[1].x - cx, points[1].y - cy)
    const n = 36
    const ring: NormPoint[] = []
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * Math.PI * 2
      ring.push({ x: cx + rad * Math.cos(t), y: cy + rad * Math.sin(t) })
    }
    return colorAlongPolyline(ring, layer, caps, samplesAlong)
  }
  if (kind === 'poly' && points.length >= 3) {
    const closed = [...points, points[0]]
    return colorAlongPolyline(closed, layer, caps, samplesAlong)
  }

  const pl = layerPolylinePoints(layer)
  if (pl && pl.length >= 2) {
    return colorAlongPolyline(pl, layer, caps, samplesAlong)
  }

  return []
}

function pointAtArcLength(
  pts: NormPoint[],
  segLens: number[],
  dist: number
): NormPoint {
  const len = segLens.reduce((a, b) => a + b, 0)
  if (dist <= 0) return pts[0]
  if (dist >= len) return pts[pts.length - 1]
  let d = 0
  for (let i = 0; i < segLens.length; i++) {
    const sl = segLens[i]
    if (d + sl >= dist - 1e-11) {
      const t = sl < 1e-12 ? 0 : (dist - d) / sl
      const a = pts[i]
      const b = pts[i + 1]
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      }
    }
    d += sl
  }
  return pts[pts.length - 1]
}

function colorAlongPolyline(
  pts: NormPoint[],
  layer: LaserShapeLayer,
  caps: LaserRgbCapabilities,
  samplesAlong: number
): LayerStrokeSeg[] {
  if (pts.length < 2) return []
  let len = 0
  const segLens: number[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const di = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y)
    segLens.push(di)
    len += di
  }
  if (len < 1e-9) {
    const c = strokeColorAt(layer, 0, caps)
    return polylineToSegs(pts, c)
  }
  const target = Math.max(2, Math.min(samplesAlong, Math.ceil(len * 40)))
  const out: LayerStrokeSeg[] = []
  for (let k = 0; k < target; k++) {
    const d0 = (len * k) / target
    const d1 = (len * (k + 1)) / target
    const p0 = pointAtArcLength(pts, segLens, d0)
    const p1 = pointAtArcLength(pts, segLens, d1)
    const tAlong = (d0 + d1) / (2 * len)
    out.push({
      x1: p0.x,
      y1: p0.y,
      x2: p1.x,
      y2: p1.y,
      color: strokeColorAt(layer, tAlong, caps),
    })
  }
  return out
}

export function layerStrokeSvgElements(
  layer: LaserShapeLayer,
  caps: LaserRgbCapabilities,
  sw: number
): ReactNode {
  const segs = layerStrokeSegments(layer, caps)
  if (segs.length > 0) {
    return (
      <g key={layer.id}>
        {segs.map((s, i) => (
          <line
            key={`${layer.id}-s-${i}`}
            x1={s.x1}
            y1={s.y1}
            x2={s.x2}
            y2={s.y2}
            stroke={s.color}
            strokeWidth={sw}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    )
  }
  return null
}
