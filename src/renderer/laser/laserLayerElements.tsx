import type { ReactNode } from 'react'
import type {
  LaserRgbCapabilities,
  LaserShapeLayer,
  NormPoint,
} from './laserEditorTypes'
import {
  editorStrokeForLaser,
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
  caps: LaserRgbCapabilities,
  huePhase01 = 0,
  rainbowClosedStroke?: boolean
): string {
  const ta = Number.isFinite(tAlong) ? tAlong : 0
  const ph = Number.isFinite(huePhase01) ? huePhase01 : 0
  const t = ((ta + ph) % 1 + 1) % 1
  if (layer.beam?.kind === 'gradient') {
    return sampleGradientHex(layer.beam.stops, t, caps)
  }
  if (layer.beam?.kind === 'rainbow') {
    return sampleRainbowHex(t, layer.beam.cycles, caps, {
      closedStroke: rainbowClosedStroke,
    })
  }
  return editorStrokeForLaser(layer.color, caps)
}

export type LayerStrokeRenderOpts = {
  /** Samples along path for gradient/rainbow / polyline resolution (higher = smoother). */
  samplesAlong?: number
  /** 0–1 phase shift along stroke for animated preview (rainbow/gradient). */
  huePhase01?: number
  /** Cap rainbow/gradient segment count for live editor preview (DAC output unchanged). */
  editorPreview?: boolean
}

/** Max colored segments per beam layer in the editor preview (not DAC sampling). */
const EDITOR_BEAM_SEGMENT_CAP = 88

/** Editor canvas stroke in pt (`vectorEffect="non-scaling-stroke"` in layerStrokeSvgElements). */
export const LASER_LAYER_STROKE_PT_NORMAL = 3.5
export const LASER_LAYER_STROKE_PT_SELECTED = 4

export function layerStrokeSegments(
  layer: LaserShapeLayer,
  caps: LaserRgbCapabilities,
  samplesAlong = 160,
  huePhase01 = 0,
  editorPreview = false
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
    return colorAlongPolyline(r, layer, caps, samplesAlong, huePhase01, editorPreview)
  }
  if (kind === 'text' && points.length >= 2) {
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
    return colorAlongPolyline(r, layer, caps, samplesAlong, huePhase01, editorPreview)
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
    return colorAlongPolyline(ring, layer, caps, samplesAlong, huePhase01, editorPreview)
  }
  if (kind === 'poly' && points.length >= 3) {
    const closed = [...points, points[0]]
    return colorAlongPolyline(closed, layer, caps, samplesAlong, huePhase01, editorPreview)
  }

  const pl = layerPolylinePoints(layer)
  if (pl && pl.length >= 2) {
    return colorAlongPolyline(pl, layer, caps, samplesAlong, huePhase01, editorPreview)
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

function polylineClosedRing(pts: NormPoint[]): boolean {
  if (pts.length < 2) return false
  const a = pts[0]!
  const b = pts[pts.length - 1]!
  return Math.hypot(a.x - b.x, a.y - b.y) < 1e-6
}

function colorAlongPolyline(
  pts: NormPoint[],
  layer: LaserShapeLayer,
  caps: LaserRgbCapabilities,
  samplesAlong: number,
  huePhase01 = 0,
  editorPreview = false
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
    const c = strokeColorAt(layer, 0, caps, huePhase01, polylineClosedRing(pts))
    return polylineToSegs(pts, c)
  }
  const minSeg = 8
  const maxSeg = editorPreview
    ? Math.max(minSeg, Math.min(EDITOR_BEAM_SEGMENT_CAP, samplesAlong))
    : Math.max(minSeg, samplesAlong)
  const density = editorPreview ? 28 : Math.max(32, samplesAlong * 1.2)
  const target = Math.max(
    minSeg,
    Math.min(maxSeg, Math.ceil(len * density))
  )
  const closedHue = polylineClosedRing(pts)
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
      color: strokeColorAt(layer, tAlong, caps, huePhase01, closedHue),
    })
  }
  return out
}

function solidPolylinePoints(
  layer: LaserShapeLayer,
  samplesAlong: number
): NormPoint[] | null {
  if (layer.beam) {
    return null
  }
  const { kind, points } = layer
  if (kind === 'text' && points.length >= 2) {
    return null
  }
  if (kind === 'spline') {
    const splinePts = Math.max(24, Math.min(160, Math.round(samplesAlong / 2)))
    const s = sampleSplinePolyline(points, splinePts)
    return s.length >= 2 ? s : null
  }
  if (kind === 'freehand' && points.length >= 2) return points
  if (kind === 'line' && points.length >= 2) return points
  if (kind === 'rect' && points.length >= 2) {
    const x0 = Math.min(points[0].x, points[1].x)
    const y0 = Math.min(points[0].y, points[1].y)
    const x1 = Math.max(points[0].x, points[1].x)
    const y1 = Math.max(points[0].y, points[1].y)
    return [
      { x: x0, y: y0 },
      { x: x1, y: y0 },
      { x: x1, y: y1 },
      { x: x0, y: y1 },
      { x: x0, y: y0 },
    ]
  }
  if (kind === 'circle' && points.length >= 2) {
    const cx = points[0].x
    const cy = points[0].y
    const rad = Math.hypot(points[1].x - cx, points[1].y - cy)
    const n = Math.max(24, Math.min(128, Math.round(samplesAlong / 2)))
    const ring: NormPoint[] = []
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * Math.PI * 2
      ring.push({ x: cx + rad * Math.cos(t), y: cy + rad * Math.sin(t) })
    }
    return ring
  }
  if (kind === 'poly' && points.length >= 3) {
    return [...points, points[0]]
  }
  return null
}

export function layerStrokeSvgElements(
  layer: LaserShapeLayer,
  caps: LaserRgbCapabilities,
  strokeWidthPt: number,
  opts?: LayerStrokeRenderOpts
): ReactNode {
  const samplesAlong = Math.max(24, Math.min(640, opts?.samplesAlong ?? 200))
  const huePhase01 = opts?.huePhase01 ?? 0
  const editorPreview = opts?.editorPreview === true

  if (
    layer.kind === 'text' &&
    layer.points.length >= 2 &&
    !layer.beam
  ) {
    const pts = layer.points
    const x0 = Math.min(pts[0].x, pts[1].x)
    const y0 = Math.min(pts[0].y, pts[1].y)
    const y1 = Math.max(pts[0].y, pts[1].y)
    const h = Math.max(1e-6, y1 - y0)
    const fs = Math.max(0.016, Math.min(0.14, h * 0.75))
    const stroke = editorStrokeForLaser(layer.color, caps)
    const label = (layer.text ?? 'Text').trim() || 'Text'
    const font = layer.fontFamily ?? 'system-ui, sans-serif'
    return (
      <text
        key={layer.id}
        x={x0 + 0.008}
        y={y0 + fs * 0.92}
        fill={stroke}
        fontSize={fs}
        fontFamily={font}
        dominantBaseline="alphabetic"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {label}
      </text>
    )
  }

  if (!layer.beam) {
    const pl = solidPolylinePoints(layer, samplesAlong)
    if (pl && pl.length >= 2) {
      const stroke = editorStrokeForLaser(layer.color, caps)
      const sw = `${Math.max(strokeWidthPt, 2)}pt`
      return (
        <polyline
          key={layer.id}
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          points={pl.map((p) => `${p.x},${p.y}`).join(' ')}
        />
      )
    }
  }

  const segs = layerStrokeSegments(layer, caps, samplesAlong, huePhase01, editorPreview)
  if (segs.length > 0) {
    const sw = `${Math.max(strokeWidthPt, 2)}pt`
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
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    )
  }
  return null
}
