import type { NormPoint } from './laserEditorTypes'

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v))
}

function clampPoint(p: NormPoint): NormPoint {
  return { x: clamp01(p.x), y: clamp01(p.y) }
}

export function splineSegmentCount(points: NormPoint[]): number {
  const n = points.length
  if (n < 4) return 0
  if ((n - 1) % 3 !== 0) return 0
  return (n - 1) / 3
}

export function isValidSplinePoints(points: NormPoint[]): boolean {
  return splineSegmentCount(points) >= 1
}

function lerpP(a: NormPoint, b: NormPoint, t: number): NormPoint {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  }
}

export function cubicPoint(
  p0: NormPoint,
  p1: NormPoint,
  p2: NormPoint,
  p3: NormPoint,
  t: number
): NormPoint {
  const u = 1 - t
  const uu = u * u
  const tt = t * t
  return {
    x:
      uu * u * p0.x +
      3 * uu * t * p1.x +
      3 * u * tt * p2.x +
      tt * t * p3.x,
    y:
      uu * u * p0.y +
      3 * uu * t * p1.y +
      3 * u * tt * p2.y +
      tt * t * p3.y,
  }
}

export function sampleSplinePolyline(
  points: NormPoint[],
  samplesPerSegment: number
): NormPoint[] {
  const segs = splineSegmentCount(points)
  if (segs < 1) return []
  const out: NormPoint[] = []
  const n = Math.max(4, samplesPerSegment)
  for (let s = 0; s < segs; s++) {
    const o = s * 3
    const p0 = points[o]
    const p1 = points[o + 1]
    const p2 = points[o + 2]
    const p3 = points[o + 3]
    for (let i = 0; i <= n; i++) {
      const t = i / n
      out.push(cubicPoint(p0, p1, p2, p3, t))
    }
  }
  return out
}

export function distancePointToSpline(
  p: NormPoint,
  points: NormPoint[],
  samplesPerSegment = 28
): number {
  const poly = sampleSplinePolyline(points, samplesPerSegment)
  if (poly.length < 2) return 1e9
  let d = 1e9
  for (let i = 0; i < poly.length; i++) {
    const dx = p.x - poly[i].x
    const dy = p.y - poly[i].y
    d = Math.min(d, Math.sqrt(dx * dx + dy * dy))
  }
  for (let i = 0; i < poly.length - 1; i++) {
    d = Math.min(d, distPointSeg(p, poly[i], poly[i + 1]))
  }
  return d
}

function distPointSeg(p: NormPoint, a: NormPoint, b: NormPoint): number {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const apx = p.x - a.x
  const apy = p.y - a.y
  const abLenSq = abx * abx + aby * aby
  if (abLenSq < 1e-14) return Math.hypot(p.x - a.x, p.y - a.y)
  let t = (apx * abx + apy * aby) / abLenSq
  t = Math.max(0, Math.min(1, t))
  const cx = a.x + t * abx
  const cy = a.y + t * aby
  return Math.hypot(p.x - cx, p.y - cy)
}

/** First segment from anchors A→B with smooth auto handles. */
export function initialSplineFourPoints(a: NormPoint, b: NormPoint): NormPoint[] {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const c1 = { x: a.x + dx / 3, y: a.y + dy / 3 }
  const c2 = { x: a.x + (2 * dx) / 3, y: a.y + (2 * dy) / 3 }
  return [a, c1, c2, b].map(clampPoint)
}

/** Append a new cubic from last anchor to `b` (adds 3 points: out, in, anchor). */
export function appendSplineSegment(
  points: NormPoint[],
  b: NormPoint
): NormPoint[] {
  if (points.length < 4) {
    const a = points[0] ?? b
    return initialSplineFourPoints(a, b)
  }
  const last = points[points.length - 1]
  const dx = b.x - last.x
  const dy = b.y - last.y
  const cOut = clampPoint({ x: last.x + dx * 0.35, y: last.y + dy * 0.35 })
  const cIn = clampPoint({ x: last.x + dx * 0.68, y: last.y + dy * 0.68 })
  return [...points, cOut, cIn, clampPoint(b)]
}

export function subdivideCubicAt(
  p0: NormPoint,
  p1: NormPoint,
  p2: NormPoint,
  p3: NormPoint,
  t: number
): { left: NormPoint[]; right: NormPoint[] } {
  const p01 = lerpP(p0, p1, t)
  const p12 = lerpP(p1, p2, t)
  const p23 = lerpP(p2, p3, t)
  const p012 = lerpP(p01, p12, t)
  const p123 = lerpP(p12, p23, t)
  const p0123 = lerpP(p012, p123, t)
  return {
    left: [p0, p01, p012, p0123].map(clampPoint),
    right: [p0123, p123, p23, p3].map(clampPoint),
  }
}

/** Find closest point on spline to `p`; return segment index and local t. */
export function closestPointOnSpline(
  points: NormPoint[],
  p: NormPoint,
  samples = 24
): { seg: number; t: number; dist: number } {
  let best = { seg: 0, t: 0.5, dist: 1e9 }
  const segs = splineSegmentCount(points)
  for (let s = 0; s < segs; s++) {
    const o = s * 3
    const p0 = points[o]
    const p1 = points[o + 1]
    const p2 = points[o + 2]
    const p3 = points[o + 3]
    for (let i = 0; i <= samples; i++) {
      const t = i / samples
      const q = cubicPoint(p0, p1, p2, p3, t)
      const d = Math.hypot(q.x - p.x, q.y - p.y)
      if (d < best.dist) {
        best = { seg: s, t, dist: d }
      }
    }
  }
  return best
}

export function insertSplinePointNear(
  points: NormPoint[],
  click: NormPoint
): NormPoint[] | null {
  if (!isValidSplinePoints(points)) return null
  const { seg, t } = closestPointOnSpline(points, click, 32)
  const o = seg * 3
  const p0 = points[o]
  const p1 = points[o + 1]
  const p2 = points[o + 2]
  const p3 = points[o + 3]
  const { left, right } = subdivideCubicAt(p0, p1, p2, p3, t)
  const before = points.slice(0, o)
  const after = points.slice(o + 4)
  return [...before, ...left, ...right.slice(1), ...after].map(clampPoint)
}

/** Remove interior anchor k (anchor index in 0..numAnchors-1), not endpoints. */
export function removeSplineAnchorAt(
  points: NormPoint[],
  anchorIndex: number
): NormPoint[] | null {
  const anchors = splineAnchorIndices(points)
  const k = anchors.indexOf(anchorIndex)
  if (k <= 0 || k >= anchors.length - 1) return null
  const start = 3 * (k - 1)
  const end = 3 * k + 4
  const block = points.slice(start, end)
  if (block.length !== 7) return null
  const A0 = block[0]
  const A1 = block[3]
  const A2 = block[6]
  const c1 = {
    x: A0.x + (A1.x - A0.x) * 0.35,
    y: A0.y + (A1.y - A0.y) * 0.35,
  }
  const c2 = {
    x: A2.x + (A1.x - A2.x) * 0.35,
    y: A2.y + (A1.y - A2.y) * 0.35,
  }
  const merged = [A0, clampPoint(c1), clampPoint(c2), A2]
  return [...points.slice(0, start), ...merged, ...points.slice(end)].map(
    clampPoint
  )
}

export function splineAnchorIndices(points: NormPoint[]): number[] {
  const ix: number[] = []
  for (let i = 0; i < points.length; i += 3) ix.push(i)
  return ix
}

export function isSplineControlIndex(points: NormPoint[], i: number): boolean {
  return isValidSplinePoints(points) && i > 0 && i < points.length - 1 && i % 3 !== 0
}
