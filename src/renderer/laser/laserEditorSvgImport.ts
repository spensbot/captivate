import { nanoid } from 'nanoid'
import type { LaserShapeLayer, NormPoint, SvgImportMode } from './laserEditorTypes'

export interface SvgSubpath {
  points: NormPoint[]
  closed: boolean
}

interface RawStroke {
  points: { x: number; y: number }[]
  closed: boolean
}

const MAX_SVG_CHARS = 2_000_000
const PATH_SAMPLES = 180

/** Subtrees that must not contribute visible geometry to the laser import. */
const SKIP_SUBTREE_TAGS = new Set([
  'defs',
  'clippath',
  'mask',
  'pattern',
  'marker',
  'lineargradient',
  'radialgradient',
  'meshgradient',
  'filter',
  /** Template content; instances come from `<use>` (not expanded in parsed DOM). */
  'symbol',
  'metadata',
  'title',
  'desc',
  'style',
  'script',
  'foreignobject',
])

function elementSkipsWholeSubtree(el: Element): boolean {
  const tag = el.tagName.toLowerCase()
  if (SKIP_SUBTREE_TAGS.has(tag)) return true
  const display = el.getAttribute('display')
  if (display === 'none') return true
  const vis = el.getAttribute('visibility')
  if (vis === 'hidden' || vis === 'collapse') return true
  const style = el.getAttribute('style') ?? ''
  if (/\bdisplay\s*:\s*none\b/i.test(style)) return true
  if (/\bvisibility\s*:\s*hidden\b/i.test(style)) return true
  return false
}

function letterboxToUnit(pts: { x: number; y: number }[]): NormPoint[] {
  if (pts.length === 0) return []
  let minX = pts[0].x
  let maxX = pts[0].x
  let minY = pts[0].y
  let maxY = pts[0].y
  for (const p of pts) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }
  const w = maxX - minX
  const h = maxY - minY
  const u = Math.max(w, h, 1e-9)
  const ox = (1 - w / u) / 2
  const oy = (1 - h / u) / 2
  return pts.map((p) => ({
    x: ox + (p.x - minX) / u,
    y: oy + (p.y - minY) / u,
  }))
}

function localToSvgRoot(
  svg: SVGSVGElement,
  el: SVGGraphicsElement,
  lx: number,
  ly: number
): { x: number; y: number } {
  const pt = svg.createSVGPoint()
  pt.x = lx
  pt.y = ly
  const ctm = el.getCTM()
  if (!ctm) return { x: lx, y: ly }
  const mapped = pt.matrixTransform(ctm)
  return { x: mapped.x, y: mapped.y }
}

function samplePath(
  path: SVGPathElement,
  svg: SVGSVGElement
): { points: { x: number; y: number }[]; closed: boolean } {
  const d = (path.getAttribute('d') || '').trim()
  const closed = /[zZ]\s*$/.test(d)
  try {
    const len = path.getTotalLength()
    if (!Number.isFinite(len) || len <= 0) return { points: [], closed }
    const n = Math.max(2, Math.min(PATH_SAMPLES, Math.ceil(len * 0.8)))
    const out: { x: number; y: number }[] = []
    for (let i = 0; i <= n; i++) {
      const p = path.getPointAtLength((len * i) / n)
      out.push(localToSvgRoot(svg, path, p.x, p.y))
    }
    return { points: out, closed }
  } catch {
    return { points: [], closed }
  }
}

function parsePointsAttr(s: string | null): { x: number; y: number }[] {
  if (!s) return []
  const nums = s
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter((n) => !Number.isNaN(n))
  const out: { x: number; y: number }[] = []
  for (let i = 0; i + 1 < nums.length; i += 2) {
    out.push({ x: nums[i], y: nums[i + 1] })
  }
  return out
}

function strokeFromLine(el: SVGLineElement, svg: SVGSVGElement): RawStroke {
  const x1 = Number(el.getAttribute('x1') || 0)
  const y1 = Number(el.getAttribute('y1') || 0)
  const x2 = Number(el.getAttribute('x2') || 0)
  const y2 = Number(el.getAttribute('y2') || 0)
  return {
    points: [
      localToSvgRoot(svg, el, x1, y1),
      localToSvgRoot(svg, el, x2, y2),
    ],
    closed: false,
  }
}

function strokeFromRect(el: SVGRectElement, svg: SVGSVGElement): RawStroke | null {
  const x = Number(el.getAttribute('x') || 0)
  const y = Number(el.getAttribute('y') || 0)
  const w = Number(el.getAttribute('width') || 0)
  const h = Number(el.getAttribute('height') || 0)
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return null
  }
  const pts = [
    localToSvgRoot(svg, el, x, y),
    localToSvgRoot(svg, el, x + w, y),
    localToSvgRoot(svg, el, x + w, y + h),
    localToSvgRoot(svg, el, x, y + h),
    localToSvgRoot(svg, el, x, y),
  ]
  return { points: pts, closed: true }
}

function strokeFromCircleLike(
  el: SVGCircleElement | SVGEllipseElement,
  svg: SVGSVGElement,
  samples: number
): RawStroke | null {
  const cx = Number(el.getAttribute('cx') || 0)
  const cy = Number(el.getAttribute('cy') || 0)
  let rx =
    el instanceof SVGEllipseElement
      ? Number(el.getAttribute('rx') || 0)
      : Number(el.getAttribute('r') || 0)
  let ry =
    el instanceof SVGEllipseElement
      ? Number(el.getAttribute('ry') || 0)
      : Number(el.getAttribute('r') || 0)
  if (el instanceof SVGCircleElement) {
    ry = rx
  }
  if (!Number.isFinite(rx) || !Number.isFinite(ry) || rx <= 0 || ry <= 0) {
    return null
  }
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * Math.PI * 2
    pts.push(
      localToSvgRoot(svg, el, cx + rx * Math.cos(t), cy + ry * Math.sin(t))
    )
  }
  return { points: pts, closed: true }
}

function bboxDiagonalForStrokes(strokes: RawStroke[]): number {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const s of strokes) {
    for (const p of s.points) {
      minX = Math.min(minX, p.x)
      maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y)
      maxY = Math.max(maxY, p.y)
    }
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return 1
  const w = maxX - minX
  const h = maxY - minY
  const d = Math.hypot(w, h)
  return d > 1e-9 ? d : 1
}

/**
 * Concatenate strokes for one import group. Strokes whose start is far from the
 * current end start a new run (multiple layers for that top-level group when
 * paths are visually separate). Nearby strokes keep short bridge segments like
 * {@link mergeRawStrokes}.
 */
function mergeRawStrokesWithGapSplit(strokes: RawStroke[]): RawStroke[] {
  if (strokes.length === 0) return []
  const diag = bboxDiagonalForStrokes(strokes)
  const gapCutoff = Math.max(diag * 0.014, 8)

  const out: RawStroke[] = []
  let cur: RawStroke | null = null

  const pushStroke = (s: RawStroke) => {
    if (s.points.length === 0) return
    if (cur === null) {
      cur = { points: s.points.slice(), closed: false }
      return
    }
    const a = cur.points[cur.points.length - 1]!
    const b = s.points[0]!
    const d = Math.hypot(a.x - b.x, a.y - b.y)
    if (d > gapCutoff) {
      out.push(cur)
      cur = { points: s.points.slice(), closed: false }
      return
    }
    if (d > 1e-6) {
      const steps = Math.min(12, Math.max(3, Math.ceil(d / 8)))
      for (let k = 1; k < steps; k++) {
        const t = k / steps
        cur.points.push({
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
        })
      }
    }
    cur.points.push(...s.points)
    if (s.closed && s.points.length > 1) {
      cur.points.push(s.points[0]!)
    }
  }

  for (const s of strokes) {
    if (s.points.length === 0) continue
    pushStroke(s)
  }
  if (cur !== null) out.push(cur)
  return out
}

function mergeRawStrokes(strokes: RawStroke[]): RawStroke {
  const pts: { x: number; y: number }[] = []
  for (const s of strokes) {
    if (s.points.length === 0) continue
    if (pts.length > 0) {
      const a = pts[pts.length - 1]!
      const b = s.points[0]!
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      if (d > 1e-6) {
        const steps = Math.min(12, Math.max(3, Math.ceil(d / 8)))
        for (let k = 1; k < steps; k++) {
          const t = k / steps
          pts.push({
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t,
          })
        }
      }
    }
    pts.push(...s.points)
    if (s.closed && s.points.length > 1) {
      pts.push(s.points[0]!)
    }
  }
  return { points: pts, closed: false }
}

function collectDrawableStrokes(root: Element, svg: SVGSVGElement): RawStroke[] {
  const out: RawStroke[] = []
  const walk = (node: Element) => {
    if (elementSkipsWholeSubtree(node)) {
      return
    }
    if (node instanceof SVGPathElement) {
      const { points: pts, closed: pathClosed } = samplePath(node, svg)
      if (pts.length >= 2) {
        out.push({ points: pts, closed: pathClosed })
      }
    } else if (node instanceof SVGLineElement) {
      const s = strokeFromLine(node, svg)
      if (s.points.length >= 2) out.push(s)
    } else if (node instanceof SVGPolylineElement) {
      const pts = parsePointsAttr(node.getAttribute('points')).map((p) =>
        localToSvgRoot(svg, node, p.x, p.y)
      )
      if (pts.length >= 2) out.push({ points: pts, closed: false })
    } else if (node instanceof SVGPolygonElement) {
      const pts = parsePointsAttr(node.getAttribute('points')).map((p) =>
        localToSvgRoot(svg, node, p.x, p.y)
      )
      if (pts.length >= 2) out.push({ points: pts, closed: true })
    } else if (node instanceof SVGRectElement) {
      const r = strokeFromRect(node, svg)
      if (r !== null) out.push(r)
    } else if (node instanceof SVGCircleElement) {
      const c = strokeFromCircleLike(node, svg, 48)
      if (c !== null) out.push(c)
    } else if (node instanceof SVGEllipseElement) {
      const e = strokeFromCircleLike(node, svg, 48)
      if (e !== null) out.push(e)
    }
    for (const ch of Array.from(node.children)) {
      walk(ch)
    }
  }
  walk(root)
  return out
}

function topLevelGroups(svg: SVGSVGElement): Element[] {
  return Array.from(svg.children).filter(
    (c) => c.tagName.toLowerCase() === 'g'
  )
}

function strokesByTopLevelGroup(svg: SVGSVGElement): RawStroke[][] {
  const groups = topLevelGroups(svg)
  if (groups.length === 0) {
    return [collectDrawableStrokes(svg, svg)]
  }
  return groups.map((g) => collectDrawableStrokes(g, svg))
}

function rawStrokeToSubpath(s: RawStroke): SvgSubpath | null {
  const n = letterboxToUnit(s.points)
  if (n.length < 2) return null
  return { points: n, closed: s.closed }
}

function subpathToLayer(sp: SvgSubpath, color: string): LaserShapeLayer | null {
  const { points, closed } = sp
  if (points.length < 2) return null
  if (closed && points.length >= 3) {
    let trimmed = points.slice()
    const a = trimmed[0]
    const b = trimmed[trimmed.length - 1]
    if (
      a &&
      b &&
      Math.hypot(a.x - b.x, a.y - b.y) < 1e-4
    ) {
      trimmed = trimmed.slice(0, -1)
    }
    if (trimmed.length >= 3) {
      return {
        id: nanoid(),
        kind: 'poly',
        color,
        points: trimmed.map((p) => ({ x: p.x, y: p.y })),
      }
    }
  }
  return {
    id: nanoid(),
    kind: 'freehand',
    color,
    points: points.map((p) => ({ x: p.x, y: p.y })),
  }
}

export function parseSvgToSubpaths(
  svgText: string,
  mode: SvgImportMode
): SvgSubpath[] {
  if (svgText.length > MAX_SVG_CHARS) {
    throw new Error('SVG file is too large.')
  }
  const host = document.createElement('div')
  host.style.cssText =
    'position:absolute;left:-99999px;top:0;width:0;height:0;overflow:hidden'
  document.body.appendChild(host)
  try {
    host.innerHTML = svgText.trim()
    const svg = host.querySelector('svg')
    if (!(svg instanceof SVGSVGElement)) {
      throw new Error('No <svg> root found.')
    }
    const rawFlat = collectDrawableStrokes(svg, svg)
    if (mode === 'single') {
      const merged = mergeRawStrokes(rawFlat)
      const sp = rawStrokeToSubpath(merged)
      return sp ? [sp] : []
    }
    if (mode === 'byGroup') {
      const groups = strokesByTopLevelGroup(svg)
      const out: SvgSubpath[] = []
      for (const g of groups) {
        if (g.length === 0) continue
        const runs = mergeRawStrokesWithGapSplit(g)
        for (const run of runs) {
          const sp = rawStrokeToSubpath(run)
          if (sp) out.push(sp)
        }
      }
      return out
    }
    const out: SvgSubpath[] = []
    for (const s of rawFlat) {
      const sp = rawStrokeToSubpath(s)
      if (sp) out.push(sp)
    }
    return out
  } finally {
    host.remove()
  }
}

export function applySvgPlacementScale(
  subpaths: SvgSubpath[],
  scale: number,
  centerX = 0.5,
  centerY = 0.5
): SvgSubpath[] {
  const s = Math.max(0.05, Math.min(4, scale))
  return subpaths.map((sp) => ({
    closed: sp.closed,
    points: sp.points.map((p) => ({
      x: clamp01(centerX + (p.x - centerX) * s),
      y: clamp01(centerY + (p.y - centerY) * s),
    })),
  }))
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v))
}

export function subpathsToLaserLayers(
  subpaths: SvgSubpath[],
  color: string
): LaserShapeLayer[] {
  const layers: LaserShapeLayer[] = []
  for (const sp of subpaths) {
    const layer = subpathToLayer(sp, color)
    if (layer) layers.push(layer)
  }
  return layers
}
