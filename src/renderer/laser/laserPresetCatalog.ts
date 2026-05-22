import type { LaserPresetParams, LaserShapeLayer, NormPoint } from './laserEditorTypes'
import { clamp01 } from './laserAnimationPath'

/** Split output (0–1) used to pin / scale preset geometry — mirrors motion pad + window. */
export type LaserPresetSplitPin = {
  x: number
  y: number
  width: number
  height: number
}

export const DEFAULT_LASER_PRESET_PARAMS: LaserPresetParams = {
  spread: 0.5,
  density: 0.55,
  motion: 0.45,
}

function cPt(p: NormPoint): NormPoint {
  return { x: clamp01(p.x), y: clamp01(p.y) }
}

function center(split?: LaserPresetSplitPin): NormPoint {
  if (!split) return { x: 0.5, y: 0.5 }
  return { x: clamp01(split.x), y: clamp01(split.y) }
}

/** Horizontal extent ~ motion-pad window size */
function span01(split: LaserPresetSplitPin | undefined, spread: number): number {
  const s = 0.28 + 0.62 * clamp01(spread)
  if (!split) return s * 0.85
  const w = clamp01(split.width)
  const h = clamp01(split.height)
  return s * (0.45 + 0.55 * Math.min(w, h))
}

function lid(sceneId: string, presetId: string, part: string) {
  return `${sceneId}::preset::${presetId}::${part}`
}

function freehand(
  sceneId: string,
  presetId: string,
  suffix: string,
  color: string,
  pts: NormPoint[]
): LaserShapeLayer {
  return {
    id: lid(sceneId, presetId, suffix),
    kind: 'freehand',
    color,
    points: pts.map(cPt),
  }
}

const CANVAS_EDGE_INSET = 0.012

function canvasXEdges(): { x0: number; x1: number } {
  return { x0: CANVAS_EDGE_INSET, x1: 1 - CANVAS_EDGE_INSET }
}

function canvasYEdges(): { y0: number; y1: number } {
  return { y0: CANVAS_EDGE_INSET, y1: 1 - CANVAS_EDGE_INSET }
}

const TAU = Math.PI * 2

/** Whole-number wave phase loops (traveling sine/saw presets). */
function presetPlaybackCycles(motion: number): number {
  const m = clamp01(motion)
  return Math.max(1, Math.min(4, Math.round(1 + m * 3)))
}

/** Phase (rad) for traveling waves; playback 0→1 loops seamlessly. */
function presetPlaybackPhaseRad(playback01: number, motion: number): number {
  return clamp01(playback01) * TAU * presetPlaybackCycles(motion)
}

/** Whole rotations per animation cycle for spin-based presets (integer → 0 rad ≡ 2πk rad). */
function presetSpinTurns(motion: number): number {
  const m = clamp01(motion)
  return Math.max(1, Math.min(3, Math.round(1 + m * 2)))
}

/** Bearing (rad) for rotating presets; progress 0 and 1 land on the same angle. */
function presetPlaybackSpinRad(playback01: number, motion: number): number {
  const p = clamp01(playback01)
  if (p <= 0 || p >= 1) return 0
  const turns = presetSpinTurns(motion)
  const rad = p * TAU * turns
  const wrapped = rad % TAU
  return wrapped < 1e-11 ? 0 : wrapped
}

function normalizeSpinRad(rad: number): number {
  if (!Number.isFinite(rad) || Math.abs(rad) < 1e-11) return 0
  const wrapped = rad % TAU
  if (wrapped < 1e-11 || Math.abs(wrapped - TAU) < 1e-11) return 0
  return wrapped
}

/** Integer sine cycles along path parameter t∈[0,1] so y(0)=y(1) on horizontal/vertical waves. */
function presetPathWaves(motion: number, minWaves: number, maxWaves: number): number {
  const m = clamp01(motion)
  return Math.max(1, Math.round(minWaves + (maxWaves - minWaves) * m))
}

/** Integer tooth count for saw/chevron fields (spatial period along t). */
function presetPathTeeth(density: number, minTeeth: number, maxTeeth: number): number {
  const d = clamp01(density)
  return Math.max(1, Math.round(minTeeth + (maxTeeth - minTeeth) * d))
}

/**
 * Drop a duplicated closing vertex so the scanner does not draw a return segment.
 * Use on loops sampled through 2π; open waves should pass `pts` through unchanged.
 */
function trimClosingDuplicate(pts: NormPoint[]): NormPoint[] {
  if (pts.length < 2) return pts.map(cPt)
  const out = pts.map(cPt)
  const a = out[0]!
  const b = out[out.length - 1]!
  if (Math.hypot(a.x - b.x, a.y - b.y) < 1e-5) {
    out.pop()
  }
  return out
}

function rotateNormPoint(p: NormPoint, c: NormPoint, rad: number): NormPoint {
  const a = normalizeSpinRad(rad)
  if (a === 0) return p
  const dx = p.x - c.x
  const dy = p.y - c.y
  const co = Math.cos(a)
  const si = Math.sin(a)
  return { x: c.x + dx * co - dy * si, y: c.y + dx * si + dy * co }
}

export type LaserPresetDefinition = {
  id: string
  label: string
  /** Section heading in the preset dropdown */
  group: string
  build: (
    sceneId: string,
    colorHex: string,
    params: LaserPresetParams,
    split: LaserPresetSplitPin | undefined,
    playback01: number
  ) => LaserShapeLayer[]
}

function buildHorizontalWave(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const cy = center(split).y
  const { x0, x1 } = canvasXEdges()
  const amp = (0.035 + 0.2 * clamp01(p.motion)) * span01(split, 0.35)
  const steps = Math.round(20 + 48 * clamp01(p.density))
  const pts: NormPoint[] = []
  const waves = presetPathWaves(p.motion, 2, 5)
  const phase = presetPlaybackPhaseRad(playback01, p.motion)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = x0 + t * (x1 - x0)
    const y = cy + Math.sin(t * Math.PI * 2 * waves + phase) * amp
    pts.push({ x, y })
  }
  return [freehand(sceneId, presetId, 'wave', color, pts)]
}

function buildVerticalWave(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const cx = center(split).x
  const { y0, y1 } = canvasYEdges()
  const amp = (0.04 + 0.22 * clamp01(p.motion)) * span01(split, 0.4)
  const steps = Math.round(22 + 52 * clamp01(p.density))
  const pts: NormPoint[] = []
  const waves = presetPathWaves(p.motion, 2, 5)
  const phase = presetPlaybackPhaseRad(playback01, p.motion)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const y = y0 + t * (y1 - y0)
    const x = cx + Math.sin(t * Math.PI * 2 * waves + phase) * amp
    pts.push({ x, y })
  }
  return [freehand(sceneId, presetId, 'vw', color, pts)]
}

function buildFigureEight(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const a = (0.1 + 0.32 * clamp01(p.spread)) * span01(split, 0.55)
  const b = a * (0.55 + 0.35 * clamp01(p.motion))
  const steps = Math.round(36 + 80 * clamp01(p.density))
  const spin = presetPlaybackSpinRad(playback01, p.motion)
  const pts: NormPoint[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    pts.push(
      rotateNormPoint(
        { x: c.x + a * Math.sin(t), y: c.y + b * Math.sin(2 * t) },
        c,
        spin
      )
    )
  }
  return [freehand(sceneId, presetId, '8', color, trimClosingDuplicate(pts))]
}

function buildLissajous(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const r = (0.12 + 0.34 * clamp01(p.spread)) * span01(split, 0.58)
  const steps = Math.round(40 + 100 * clamp01(p.density))
  const a = 3 + Math.floor(4 * clamp01(p.motion))
  const b = 4 + Math.floor(3 * (1 - clamp01(p.motion) * 0.5))
  const spin = presetPlaybackSpinRad(playback01, p.motion)
  const pts: NormPoint[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    pts.push(
      rotateNormPoint(
        { x: c.x + r * Math.sin(a * t), y: c.y + r * Math.sin(b * t) },
        c,
        spin
      )
    )
  }
  return [freehand(sceneId, presetId, 'lis', color, trimClosingDuplicate(pts))]
}

function buildSpiral(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const turns = Math.max(2, Math.round(2 + 3 * clamp01(p.density)))
  const maxR = (0.08 + 0.38 * clamp01(p.spread)) * span01(split, 0.6)
  const steps = Math.round(48 + 120 * clamp01(p.density))
  const pts: NormPoint[] = []
  const spin = presetPlaybackSpinRad(playback01, p.motion)
  const spiralBias = normalizeSpinRad(clamp01(p.motion) * 1.7)
  for (let i = 0; i <= steps; i++) {
    const u = i / steps
    const baseAng = u * turns * TAU + spiralBias
    const rad = maxR * u
    pts.push(
      rotateNormPoint(
        { x: c.x + Math.cos(baseAng) * rad, y: c.y + Math.sin(baseAng) * rad },
        c,
        spin
      )
    )
  }
  return [freehand(sceneId, presetId, 'spir', color, pts)]
}

function buildLineFan(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const r = 0.12 + 0.38 * clamp01(p.spread) * span01(split, 0.5)
  const n = Math.max(4, Math.round(5 + 11 * clamp01(p.density)))
  const layers: LaserShapeLayer[] = []
  const spin = presetPlaybackSpinRad(playback01, p.motion)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + spin
    layers.push({
      id: lid(sceneId, presetId, `fan-${i}`),
      kind: 'line',
      color,
      points: [
        cPt({ x: c.x, y: c.y }),
        cPt({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r }),
      ],
    })
  }
  return layers
}

function buildStarRays(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  count: number,
  playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const r = (0.14 + 0.4 * clamp01(p.spread)) * span01(split, 0.55)
  const n = Math.min(count, Math.max(5, Math.round(count * (0.5 + 0.5 * clamp01(p.density)))))
  const layers: LaserShapeLayer[] = []
  const spin = presetPlaybackSpinRad(playback01, p.motion)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + spin
    layers.push({
      id: lid(sceneId, presetId, `sr-${i}`),
      kind: 'line',
      color,
      points: [
        cPt({ x: c.x, y: c.y }),
        cPt({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r }),
      ],
    })
  }
  return layers
}

function buildDotGrid(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  _playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const ext = 0.1 + 0.35 * clamp01(p.spread) * span01(split, 0.55)
  const grid = Math.min(10, Math.max(3, Math.round(3 + 7 * clamp01(p.density))))
  const rad = (0.006 + 0.018 * clamp01(p.motion)) * ext
  const layers: LaserShapeLayer[] = []
  let k = 0
  for (let iy = 0; iy < grid; iy++) {
    for (let ix = 0; ix < grid; ix++) {
      const u = grid === 1 ? 0.5 : ix / (grid - 1)
      const v = grid === 1 ? 0.5 : iy / (grid - 1)
      const x = c.x + (u - 0.5) * 2 * ext
      const y = c.y + (v - 0.5) * 2 * ext
      layers.push({
        id: lid(sceneId, presetId, `dot-${k++}`),
        kind: 'circle',
        color,
        points: [
          cPt({ x, y }),
          cPt({ x: x + rad, y }),
        ],
      })
    }
  }
  return layers
}

function buildSquareFrame(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const half = (0.12 + 0.32 * clamp01(p.spread)) * span01(split, 0.6)
  const jitter = 0.02 * clamp01(p.motion) * (split ? 1 : 0.5)
  const spin = presetPlaybackSpinRad(playback01, p.motion)
  const p0 = rotateNormPoint({ x: c.x - half + jitter, y: c.y - half }, c, spin)
  const p1 = rotateNormPoint({ x: c.x + half, y: c.y + half }, c, spin)
  return [
    {
      id: lid(sceneId, presetId, 'square'),
      kind: 'rect',
      color,
      points: [cPt(p0), cPt(p1)],
    },
  ]
}

function buildCircleOrbit(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const r = (0.1 + 0.38 * clamp01(p.spread)) * span01(split, 0.55)
  const rad = r * (0.85 + 0.15 * clamp01(p.motion))
  const spin = normalizeSpinRad(presetPlaybackSpinRad(playback01, p.motion))
  return [
    {
      id: lid(sceneId, presetId, 'circle'),
      kind: 'circle',
      color,
      points: [
        cPt({ x: c.x, y: c.y }),
        cPt({
          x: c.x + Math.cos(spin) * rad,
          y: c.y + Math.sin(spin) * rad,
        }),
      ],
    },
  ]
}

function buildConcentricRings(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const maxR = (0.12 + 0.4 * clamp01(p.spread)) * span01(split, 0.58)
  const n = Math.min(8, Math.max(2, Math.round(2 + 6 * clamp01(p.density))))
  const spin = normalizeSpinRad(presetPlaybackSpinRad(playback01, p.motion))
  const layers: LaserShapeLayer[] = []
  for (let i = 1; i <= n; i++) {
    const r = (maxR * i) / n * (0.75 + 0.25 * clamp01(p.motion))
    layers.push({
      id: lid(sceneId, presetId, `ring-${i}`),
      kind: 'circle',
      color,
      points: [
        cPt({ x: c.x, y: c.y }),
        cPt({ x: c.x + Math.cos(spin) * r, y: c.y + Math.sin(spin) * r }),
      ],
    })
  }
  return layers
}

function buildNestedSquares(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const maxH = (0.1 + 0.38 * clamp01(p.spread)) * span01(split, 0.58)
  const n = Math.min(7, Math.max(2, Math.round(2 + 5 * clamp01(p.density))))
  const spin = presetPlaybackSpinRad(playback01, p.motion)
  const layers: LaserShapeLayer[] = []
  for (let i = 1; i <= n; i++) {
    const h = (maxH * i) / n
    const j = 0.012 * i * clamp01(p.motion)
    const p0 = rotateNormPoint({ x: c.x - h + j, y: c.y - h }, c, spin)
    const p1 = rotateNormPoint({ x: c.x + h + j, y: c.y + h }, c, spin)
    layers.push({
      id: lid(sceneId, presetId, `nsq-${i}`),
      kind: 'rect',
      color,
      points: [cPt(p0), cPt(p1)],
    })
  }
  return layers
}

function buildScanlineHaze(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const { x0, x1 } = canvasXEdges()
  const { y0, y1 } = canvasYEdges()
  const n = Math.min(28, Math.max(6, Math.round(8 + 22 * clamp01(p.density))))
  const layers: LaserShapeLayer[] = []
  const sway = 0.02 * clamp01(p.motion) * span01(split, 0.3)
  const phase = presetPlaybackPhaseRad(playback01, p.motion)
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1 || 1)
    const y = y0 + t * (y1 - y0) + Math.sin(i * 0.45 + phase) * sway
    layers.push({
      id: lid(sceneId, presetId, `hz-${i}`),
      kind: 'line',
      color,
      points: [cPt({ x: x0, y }), cPt({ x: x1, y })],
    })
  }
  return layers
}

function buildVerticalStrings(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const { x0, x1 } = canvasXEdges()
  const { y0, y1 } = canvasYEdges()
  const n = Math.min(22, Math.max(5, Math.round(6 + 16 * clamp01(p.density))))
  const amp = 0.03 * clamp01(p.motion) * span01(split, 0.35)
  const phase = presetPlaybackPhaseRad(playback01, p.motion)
  const layers: LaserShapeLayer[] = []
  const steps = 12
  for (let i = 0; i < n; i++) {
    const bx = x0 + (i / (n - 1 || 1)) * (x1 - x0)
    const pts: NormPoint[] = []
    for (let j = 0; j <= steps; j++) {
      const t = j / steps
      const y = y0 + t * (y1 - y0)
      const x = bx + Math.sin(t * Math.PI * 2 + i * 0.5 + phase) * amp
      pts.push({ x, y })
    }
    layers.push(freehand(sceneId, presetId, `vs-${i}`, color, pts))
  }
  return layers
}

function buildChevronField(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const cy = center(split).y
  const { x0, x1 } = canvasXEdges()
  const zig = Math.max(5, Math.round(6 + 14 * clamp01(p.density)))
  const pts: NormPoint[] = []
  const amp = (0.08 + 0.2 * clamp01(p.motion)) * span01(split, 0.35)
  const phase = presetPlaybackPhaseRad(playback01, p.motion)
  const teeth = presetPathTeeth(p.density, 4, 10)
  for (let i = 0; i <= zig; i++) {
    const t = i / zig
    const x = x0 + t * (x1 - x0)
    const y = cy + Math.sign(Math.sin(t * Math.PI * 2 * teeth + phase)) * amp
    pts.push({ x, y })
  }
  return [freehand(sceneId, presetId, 'zig', color, pts)]
}

function buildArcCanopy(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const r = (0.18 + 0.42 * clamp01(p.spread)) * span01(split, 0.62)
  const steps = Math.round(24 + 56 * clamp01(p.density))
  const spin = presetPlaybackSpinRad(playback01, p.motion)
  const pts: NormPoint[] = []
  const arc = Math.PI * (0.85 + 0.15 * clamp01(p.motion))
  const arcStart = Math.PI * 0.08
  for (let i = 0; i <= steps; i++) {
    const t = arcStart + (i / steps) * arc
    pts.push(
      rotateNormPoint(
        { x: c.x + Math.cos(t) * r, y: c.y - Math.sin(t) * r * 0.55 },
        c,
        spin
      )
    )
  }
  return [freehand(sceneId, presetId, 'arc', color, pts)]
}

function buildMultiArc(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const r0 = (0.12 + 0.28 * clamp01(p.spread)) * span01(split, 0.55)
  const layers: LaserShapeLayer[] = []
  const count = Math.min(5, Math.max(2, Math.round(2 + 3 * clamp01(p.density))))
  const spin = presetPlaybackSpinRad(playback01, p.motion)
  for (let k = 0; k < count; k++) {
    const r = r0 * (0.45 + (0.55 * (k + 1)) / count)
    const steps = 28
    const pts: NormPoint[] = []
    const off = (k / count) * 0.35 * clamp01(p.motion)
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI + off
      pts.push(
        rotateNormPoint(
          { x: c.x + Math.cos(t) * r, y: c.y - Math.sin(t) * r * 0.5 },
          c,
          spin
        )
      )
    }
    layers.push(freehand(sceneId, presetId, `marc-${k}`, color, pts))
  }
  return layers
}

function buildCrossHairs(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const span = span01(split, p.spread) * (0.9 + 0.1 * clamp01(p.motion))
  const spin = presetPlaybackSpinRad(playback01, p.motion)
  return [
    {
      id: lid(sceneId, presetId, 'h'),
      kind: 'line',
      color,
      points: [
        cPt(rotateNormPoint({ x: c.x - span, y: c.y }, c, spin)),
        cPt(rotateNormPoint({ x: c.x + span, y: c.y }, c, spin)),
      ],
    },
    {
      id: lid(sceneId, presetId, 'v'),
      kind: 'line',
      color,
      points: [
        cPt(rotateNormPoint({ x: c.x, y: c.y - span }, c, spin)),
        cPt(rotateNormPoint({ x: c.x, y: c.y + span }, c, spin)),
      ],
    },
  ]
}

function buildDiamond(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const h = (0.14 + 0.36 * clamp01(p.spread)) * span01(split, 0.56)
  const w = h * (0.75 + 0.25 * clamp01(p.motion))
  const spin = presetPlaybackSpinRad(playback01, p.motion)
  const pts: NormPoint[] = [
    rotateNormPoint({ x: c.x, y: c.y - h }, c, spin),
    rotateNormPoint({ x: c.x + w, y: c.y }, c, spin),
    rotateNormPoint({ x: c.x, y: c.y + h }, c, spin),
    rotateNormPoint({ x: c.x - w, y: c.y }, c, spin),
    rotateNormPoint({ x: c.x, y: c.y - h }, c, spin),
  ]
  return [freehand(sceneId, presetId, 'dia', color, trimClosingDuplicate(pts))]
}

function buildHexWeb(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const r = (0.14 + 0.38 * clamp01(p.spread)) * span01(split, 0.55)
  const spin = presetPlaybackSpinRad(playback01, p.motion)
  const layers: LaserShapeLayer[] = []
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU
    layers.push({
      id: lid(sceneId, presetId, `hx-${i}`),
      kind: 'line',
      color,
      points: [
        cPt({ x: c.x, y: c.y }),
        cPt(
          rotateNormPoint(
            { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r },
            c,
            spin
          )
        ),
      ],
    })
  }
  const ringPts: NormPoint[] = []
  const steps = 36
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * TAU
    ringPts.push(
      rotateNormPoint(
        {
          x: c.x + Math.cos(t) * r * 0.55,
          y: c.y + Math.sin(t) * r * 0.55,
        },
        c,
        spin
      )
    )
  }
  layers.push(freehand(sceneId, presetId, 'hxring', color, trimClosingDuplicate(ringPts)))
  return layers
}

function buildTripleWave(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  _playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const amp = (0.028 + 0.12 * clamp01(p.motion)) * span01(split, 0.35)
  const layers: LaserShapeLayer[] = []
  const waves = presetPathWaves(p.density, 2, 4)
  const steps = 36
  const { x0, x1 } = canvasXEdges()
  const phase = presetPlaybackPhaseRad(_playback01, p.motion)
  for (let k = -1; k <= 1; k++) {
    const pts: NormPoint[] = []
    const oy = k * amp * 2.2
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const x = x0 + t * (x1 - x0)
      const y = c.y + oy + Math.sin(t * Math.PI * 2 * waves + phase) * amp
      pts.push({ x, y })
    }
    layers.push(freehand(sceneId, presetId, `tw-${k}`, color, pts))
  }
  return layers
}

function buildSawWave(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  _playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const amp = (0.05 + 0.18 * clamp01(p.motion)) * span01(split, 0.4)
  const teeth = presetPathTeeth(p.density, 5, 22)
  const pts: NormPoint[] = []
  const { x0, x1 } = canvasXEdges()
  const phaseTurns =
    presetPlaybackCycles(p.motion) * clamp01(_playback01)
  const steps = Math.max(teeth * 6, 48)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = x0 + t * (x1 - x0)
    const ph = t * teeth + phaseTurns
    const f = ph - Math.floor(ph)
    const tri = 2 * Math.abs(2 * f - 1) - 1
    const y = c.y + tri * amp * 0.5
    pts.push({ x, y })
  }
  return [freehand(sceneId, presetId, 'saw', color, pts)]
}

function buildAuroraVeils(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const { x0, x1 } = canvasXEdges()
  const { y0, y1 } = canvasYEdges()
  const cols = Math.min(9, Math.max(3, Math.round(3 + 6 * clamp01(p.density))))
  const layers: LaserShapeLayer[] = []
  const amp = (0.06 + 0.16 * clamp01(p.motion)) * span01(split, 0.38)
  const phase = presetPlaybackPhaseRad(playback01, p.motion)
  const steps = 22
  for (let k = 0; k < cols; k++) {
    const colX = x0 + (k / (cols - 1 || 1)) * (x1 - x0)
    const pts: NormPoint[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const y = y0 + t * (y1 - y0)
      const x = colX + Math.sin(t * Math.PI * 4 + k * 0.7 + phase) * amp
      pts.push({ x, y })
    }
    layers.push(freehand(sceneId, presetId, `aur-${k}`, color, pts))
  }
  return layers
}

function buildTunnelVanish(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  _playback01: number
): LaserShapeLayer[] {
  const vx = clamp01(center(split).x + 0.02 * clamp01(p.motion))
  const vy = 0.08 + 0.12 * (1 - clamp01(p.spread))
  const span = span01(split, p.spread)
  const n = Math.min(24, Math.max(8, Math.round(10 + 14 * clamp01(p.density))))
  const layers: LaserShapeLayer[] = []
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1 || 1) - 0.5) * 1.4
    const x1 = vx + t * span * 0.35
    const y1 = vy + 0.55 * span01(split, 0.45)
    layers.push({
      id: lid(sceneId, presetId, `tun-${i}`),
      kind: 'line',
      color,
      points: [
        cPt({ x: vx, y: vy }),
        cPt({ x: x1, y: y1 }),
      ],
    })
  }
  return layers
}

function buildRoseCurve(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const k = 2 + Math.floor(5 * clamp01(p.density))
  const R = (0.1 + 0.36 * clamp01(p.spread)) * span01(split, 0.58)
  const steps = Math.round(48 + 90 * clamp01(p.density))
  const spin = presetPlaybackSpinRad(playback01, p.motion)
  const pts: NormPoint[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * TAU
    const r = R * Math.abs(Math.cos(k * t))
    pts.push(
      rotateNormPoint(
        { x: c.x + Math.cos(t) * r, y: c.y + Math.sin(t) * r },
        c,
        spin
      )
    )
  }
  return [freehand(sceneId, presetId, 'rose', color, trimClosingDuplicate(pts))]
}

function buildCardioidSweep(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const a = (0.08 + 0.28 * clamp01(p.spread)) * span01(split, 0.55)
  const steps = Math.round(50 + 90 * clamp01(p.density))
  const spin = presetPlaybackSpinRad(playback01, p.motion)
  const pts: NormPoint[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const r = a * (1 - Math.cos(t))
    pts.push(
      rotateNormPoint(
        { x: c.x + Math.cos(t) * r, y: c.y + Math.sin(t) * r * 0.92 },
        c,
        spin
      )
    )
  }
  return [freehand(sceneId, presetId, 'card', color, trimClosingDuplicate(pts))]
}

function buildEllipsePortal(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const rx = (0.14 + 0.34 * clamp01(p.spread)) * span01(split, 0.55)
  const ry = rx * (0.55 + 0.4 * clamp01(p.motion))
  const steps = Math.round(40 + 72 * clamp01(p.density))
  const tilt = clamp01(p.motion) * 0.7
  const spin = presetPlaybackSpinRad(playback01, p.motion)
  const pts: NormPoint[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const x0 = Math.cos(t) * rx
    const y0 = Math.sin(t) * ry
    pts.push(
      rotateNormPoint(
        {
          x: c.x + x0 * Math.cos(tilt) - y0 * Math.sin(tilt),
          y: c.y + x0 * Math.sin(tilt) + y0 * Math.cos(tilt),
        },
        c,
        spin
      )
    )
  }
  return [freehand(sceneId, presetId, 'ell', color, trimClosingDuplicate(pts))]
}

function buildWeaveHatch(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  _playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const span = span01(split, p.spread)
  const n = Math.min(18, Math.max(6, Math.round(7 + 11 * clamp01(p.density))))
  const layers: LaserShapeLayer[] = []
  const skew = 0.25 + 0.35 * clamp01(p.motion)
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1 || 1) - 0.5) * 2
    layers.push({
      id: lid(sceneId, presetId, `h1-${i}`),
      kind: 'line',
      color,
      points: [
        cPt({ x: c.x + u * span, y: c.y - span }),
        cPt({ x: c.x + u * span + skew * span, y: c.y + span }),
      ],
    })
  }
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1 || 1) - 0.5) * 2
    layers.push({
      id: lid(sceneId, presetId, `h2-${i}`),
      kind: 'line',
      color,
      points: [
        cPt({ x: c.x + u * span - skew * span, y: c.y - span }),
        cPt({ x: c.x + u * span, y: c.y + span }),
      ],
    })
  }
  return layers
}

function buildSilkRibbon(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const cy = center(split).y
  const { x0, x1 } = canvasXEdges()
  const steps = Math.round(56 + 100 * clamp01(p.density))
  const pts: NormPoint[] = []
  const waves = presetPathWaves(p.motion, 2, 4)
  const phase = presetPlaybackPhaseRad(playback01, p.motion)
  const amp1 = 0.07 * span01(split, 0.4)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = x0 + t * (x1 - x0)
    const y =
      cy +
      Math.sin(t * Math.PI * 2 * waves + phase) * amp1 +
      Math.sin(t * Math.PI * 2 * waves * 3 + phase) * 0.025
    pts.push({ x, y })
  }
  return [freehand(sceneId, presetId, 'silk', color, pts)]
}

function buildLightningJag(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const cx = center(split).x
  const { y0, y1 } = canvasYEdges()
  const segs = Math.min(40, Math.max(12, Math.round(14 + 26 * clamp01(p.density))))
  const phase = presetPlaybackPhaseRad(playback01, p.motion)
  const j = (0.04 + 0.12 * clamp01(p.motion)) * span01(split, 0.4)
  const pts: NormPoint[] = [{ x: cx, y: y0 }]
  let x = cx
  for (let i = 1; i <= segs; i++) {
    const t = i / segs
    x += (Math.sin(i * 3.1 + phase) * 0.5 + (i & 1 ? 0.35 : -0.35)) * j
    const y = y0 + t * (y1 - y0)
    pts.push({ x, y })
  }
  return [freehand(sceneId, presetId, 'bolt', color, pts)]
}

function buildParabolicFountain(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  _playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const span = span01(split, p.spread)
  const layers: LaserShapeLayer[] = []
  const streams = Math.min(11, Math.max(3, Math.round(3 + 8 * clamp01(p.density))))
  for (let k = 0; k < streams; k++) {
    const x0 = c.x + ((k / (streams - 1 || 1)) - 0.5) * span * 1.2
    const steps = 24
    const pts: NormPoint[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const x = x0 + (t - 0.5) * span * 0.35 * clamp01(p.motion)
      const y = c.y + t * span * 0.85 - t * t * span * (0.5 + 0.4 * clamp01(p.spread))
      pts.push({ x, y })
    }
    layers.push(freehand(sceneId, presetId, `fnt-${k}`, color, pts))
  }
  return layers
}

function buildDoubleHelix(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const cx = center(split).x
  const { y0, y1 } = canvasYEdges()
  const r = (0.04 + 0.14 * clamp01(p.motion)) * span01(split, 0.45)
  const turns = Math.max(2, Math.round(2 + 3 * clamp01(p.density)))
  const phase = presetPlaybackPhaseRad(playback01, p.motion)
  const steps = 56
  const ptsA: NormPoint[] = []
  const ptsB: NormPoint[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const ang = t * turns * Math.PI * 2 + phase
    const y = y0 + t * (y1 - y0)
    ptsA.push({
      x: cx + Math.cos(ang) * r,
      y,
    })
    ptsB.push({
      x: cx + Math.cos(ang + Math.PI) * r,
      y,
    })
  }
  return [
    freehand(sceneId, presetId, 'helA', color, ptsA),
    freehand(sceneId, presetId, 'helB', color, ptsB),
  ]
}

function buildCelticKnotHint(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  _playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const r = (0.1 + 0.32 * clamp01(p.spread)) * span01(split, 0.52)
  const pts: NormPoint[] = []
  const loops = 3
  const steps = 90
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2 * loops
    const x = c.x + Math.cos(t) * r * (1 + 0.22 * Math.sin(3 * t + clamp01(p.motion) * 2))
    const y = c.y + Math.sin(t) * r * (1 + 0.22 * Math.cos(3 * t))
    pts.push({ x, y })
  }
  return [freehand(sceneId, presetId, 'knot', color, pts)]
}

function buildBreathingCircle(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const base = (0.12 + 0.36 * clamp01(p.spread)) * span01(split, 0.56)
  const r = base * (0.92 + 0.08 * Math.sin(presetPlaybackPhaseRad(playback01, p.motion)))
  const spin = normalizeSpinRad(presetPlaybackSpinRad(playback01, p.motion))
  return [
    {
      id: lid(sceneId, presetId, 'breathe'),
      kind: 'circle',
      color,
      points: [
        cPt({ x: c.x, y: c.y }),
        cPt({ x: c.x + Math.cos(spin) * r, y: c.y + Math.sin(spin) * r }),
      ],
    },
  ]
}

function buildPentagramOutline(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const r = (0.14 + 0.38 * clamp01(p.spread)) * span01(split, 0.55)
  const spin = presetPlaybackSpinRad(playback01, p.motion)
  const order = [0, 2, 4, 1, 3, 0]
  const pts: NormPoint[] = []
  for (const i of order) {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / 5 + spin
    pts.push({
      x: c.x + Math.cos(ang) * r,
      y: c.y + Math.sin(ang) * r,
    })
  }
  return [freehand(sceneId, presetId, 'pent', color, trimClosingDuplicate(pts))]
}

function buildInfinityRibbon(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const a = (0.1 + 0.3 * clamp01(p.spread)) * span01(split, 0.54)
  const steps = Math.round(44 + 80 * clamp01(p.density))
  const spin = presetPlaybackSpinRad(playback01, p.motion)
  const pts: NormPoint[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const den = 1 + Math.sin(t) ** 2
    pts.push(
      rotateNormPoint(
        {
          x: c.x + (Math.sqrt(2) * a * Math.cos(t)) / den,
          y: c.y + (a * Math.sin(2 * t)) / den * 0.85 + clamp01(p.motion) * 0.02,
        },
        c,
        spin
      )
    )
  }
  return [freehand(sceneId, presetId, 'lemn', color, trimClosingDuplicate(pts))]
}

function buildHorizonRing(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const rx = (0.35 + 0.45 * clamp01(p.spread)) * span01(split, 0.6)
  const ry = rx * (0.12 + 0.18 * clamp01(p.motion))
  const steps = Math.round(36 + 48 * clamp01(p.density))
  const spin = presetPlaybackSpinRad(playback01, p.motion)
  const pts: NormPoint[] = []
  const y0 = c.y + 0.22 * span01(split, 0.35)
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * TAU
    pts.push(
      rotateNormPoint(
        { x: c.x + Math.cos(t) * rx, y: y0 + Math.sin(t) * ry },
        c,
        spin
      )
    )
  }
  return [freehand(sceneId, presetId, 'horiz', color, trimClosingDuplicate(pts))]
}

function buildChaosWeb(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const r = (0.12 + 0.4 * clamp01(p.spread)) * span01(split, 0.55)
  const lines = Math.min(32, Math.max(10, Math.round(12 + 20 * clamp01(p.density))))
  const spin = presetPlaybackSpinRad(playback01, p.motion)
  const layers: LaserShapeLayer[] = []
  for (let i = 0; i < lines; i++) {
    const a1 = (i * 0.618 + clamp01(p.motion)) * Math.PI * 7 + spin
    const a2 = a1 + 1.7 + (i % 5) * 0.2
    layers.push({
      id: lid(sceneId, presetId, `cw-${i}`),
      kind: 'line',
      color,
      points: [
        cPt({
          x: c.x + Math.cos(a1) * r * 0.15,
          y: c.y + Math.sin(a1) * r * 0.15,
        }),
        cPt({
          x: c.x + Math.cos(a2) * r,
          y: c.y + Math.sin(a2) * r,
        }),
      ],
    })
  }
  return layers
}

function buildRainShear(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const { x0, x1 } = canvasXEdges()
  const { y0, y1 } = canvasYEdges()
  const n = Math.min(26, Math.max(10, Math.round(12 + 14 * clamp01(p.density))))
  const shear = (0.08 + 0.22 * clamp01(p.motion)) * span01(split, 0.4)
  const phase = presetPlaybackPhaseRad(playback01, p.motion)
  const layers: LaserShapeLayer[] = []
  for (let i = 0; i < n; i++) {
    const xb = x0 + (i / (n - 1 || 1)) * (x1 - x0)
    const skew = shear * (0.85 + 0.15 * Math.sin(i * 0.35 + phase))
    layers.push({
      id: lid(sceneId, presetId, `rn-${i}`),
      kind: 'line',
      color,
      points: [cPt({ x: xb, y: y0 }), cPt({ x: xb + skew, y: y1 })],
    })
  }
  return layers
}

function buildCrownArcs(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const w = span01(split, p.spread)
  const layers: LaserShapeLayer[] = []
  const count = Math.min(7, Math.max(2, Math.round(2 + 5 * clamp01(p.density))))
  const spin = presetPlaybackSpinRad(playback01, p.motion)
  for (let k = 0; k < count; k++) {
    const t0 = -0.35 - (k / count) * 0.25 * clamp01(p.motion)
    const t1 = 0.35 + (k / count) * 0.25 * clamp01(p.motion)
    const steps = 22
    const pts: NormPoint[] = []
    const r = w * (0.55 + 0.45 * ((k + 1) / count))
    const yb = c.y + 0.05 * span01(split, 0.3)
    for (let i = 0; i <= steps; i++) {
      const u = i / steps
      const t = t0 + (t1 - t0) * u
      pts.push(
        rotateNormPoint(
          {
            x: c.x + Math.cos(t * Math.PI) * r,
            y: yb - Math.sin(t * Math.PI) * r * 0.42,
          },
          c,
          spin
        )
      )
    }
    layers.push(freehand(sceneId, presetId, `crn-${k}`, color, pts))
  }
  return layers
}

function buildGridCross(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const span = span01(split, p.spread)
  const g = Math.min(12, Math.max(4, Math.round(4 + 8 * clamp01(p.density))))
  const spin = presetPlaybackSpinRad(playback01, p.motion)
  const layers: LaserShapeLayer[] = []
  for (let i = 0; i < g; i++) {
    const u = (i / (g - 1 || 1) - 0.5) * 2
    layers.push({
      id: lid(sceneId, presetId, `gx-${i}`),
      kind: 'line',
      color,
      points: [
        cPt(rotateNormPoint({ x: c.x + u * span, y: c.y - span }, c, spin)),
        cPt(rotateNormPoint({ x: c.x + u * span, y: c.y + span }, c, spin)),
      ],
    })
  }
  for (let i = 0; i < g; i++) {
    const u = (i / (g - 1 || 1) - 0.5) * 2
    layers.push({
      id: lid(sceneId, presetId, `gy-${i}`),
      kind: 'line',
      color,
      points: [
        cPt(rotateNormPoint({ x: c.x - span, y: c.y + u * span }, c, spin)),
        cPt(rotateNormPoint({ x: c.x + span, y: c.y + u * span }, c, spin)),
      ],
    })
  }
  return layers
}

function buildShootingStars(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const c = center(split)
  const span = span01(split, p.spread)
  const n = Math.min(14, Math.max(4, Math.round(4 + 10 * clamp01(p.density))))
  const layers: LaserShapeLayer[] = []
  const streak = 0.08 + 0.2 * clamp01(p.motion)
  const spin = presetPlaybackSpinRad(playback01, p.motion)
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI + 0.2 + spin
    const x1 = c.x + Math.cos(ang) * span * 0.9
    const y1 = c.y - Math.sin(ang) * span * 0.55
    layers.push({
      id: lid(sceneId, presetId, `st-${i}`),
      kind: 'line',
      color,
      points: [
        cPt({ x: x1, y: y1 }),
        cPt({
          x: x1 - Math.cos(ang) * span * streak,
          y: y1 + Math.sin(ang) * span * streak,
        }),
      ],
    })
  }
  return layers
}

function buildMandelStep(
  sceneId: string,
  presetId: string,
  color: string,
  p: LaserPresetParams,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const cx = center(split).x
  const cy = center(split).y
  const span = span01(split, p.spread) * 0.42
  const phase = presetPlaybackPhaseRad(playback01, p.motion)
  const steps = Math.round(60 + 100 * clamp01(p.density))
  const pts: NormPoint[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 6
    const x =
      cx + Math.sin(t * 1.3 + phase) * span + Math.cos(t * 0.7 + phase * 0.35) * span * 0.35
    const y =
      cy + Math.cos(t * 1.1 + phase * 0.6) * span * 0.9 + Math.sin(t * 2.2 + phase * 1.8) * span * 0.12
    pts.push({ x, y })
  }
  return [freehand(sceneId, presetId, 'mand', color, pts)]
}

export const LASER_PRESET_CATALOG: LaserPresetDefinition[] = [
  { id: 'horizontal_wave', group: 'Waves', label: 'Wave · horizontal', build: (sid, c, p, s, pb) => buildHorizontalWave(sid, 'horizontal_wave', c, p, s, pb) },
  { id: 'vertical_wave', group: 'Waves', label: 'Wave · vertical', build: (sid, c, p, s, pb) => buildVerticalWave(sid, 'vertical_wave', c, p, s, pb) },
  { id: 'triple_wave', group: 'Waves', label: 'Waves · triple stack', build: (sid, c, p, s, pb) => buildTripleWave(sid, 'triple_wave', c, p, s, pb) },
  { id: 'saw_wave', group: 'Waves', label: 'Wave · sawtooth', build: (sid, c, p, s, pb) => buildSawWave(sid, 'saw_wave', c, p, s, pb) },
  { id: 'figure_eight', group: 'Ribbons & curves', label: 'Ribbon · figure eight', build: (sid, c, p, s, pb) => buildFigureEight(sid, 'figure_eight', c, p, s, pb) },
  { id: 'infinity_ribbon', group: 'Ribbons & curves', label: 'Ribbon · infinity', build: (sid, c, p, s, pb) => buildInfinityRibbon(sid, 'infinity_ribbon', c, p, s, pb) },
  { id: 'lissajous', group: 'Ribbons & curves', label: 'Curve · Lissajous', build: (sid, c, p, s, pb) => buildLissajous(sid, 'lissajous', c, p, s, pb) },
  { id: 'spiral', group: 'Spirals', label: 'Spiral · out', build: (sid, c, p, s, pb) => buildSpiral(sid, 'spiral', c, p, s, pb) },
  { id: 'double_helix', group: 'Spirals', label: 'Spiral · double helix', build: (sid, c, p, s, pb) => buildDoubleHelix(sid, 'double_helix', c, p, s, pb) },
  { id: 'rose_curve', group: 'Parametric shapes', label: 'Rose curve', build: (sid, c, p, s, pb) => buildRoseCurve(sid, 'rose_curve', c, p, s, pb) },
  { id: 'cardioid', group: 'Parametric shapes', label: 'Cardioid', build: (sid, c, p, s, pb) => buildCardioidSweep(sid, 'cardioid', c, p, s, pb) },
  { id: 'ellipse_portal', group: 'Parametric shapes', label: 'Ellipse portal', build: (sid, c, p, s, pb) => buildEllipsePortal(sid, 'ellipse_portal', c, p, s, pb) },
  { id: 'horizon_ring', group: 'Parametric shapes', label: 'Horizon ring (flat)', build: (sid, c, p, s, pb) => buildHorizonRing(sid, 'horizon_ring', c, p, s, pb) },
  { id: 'arc_canopy', group: 'Canopy', label: 'Canopy · single arc', build: (sid, c, p, s, pb) => buildArcCanopy(sid, 'arc_canopy', c, p, s, pb) },
  { id: 'multi_arc', group: 'Canopy', label: 'Canopy · stacked arcs', build: (sid, c, p, s, pb) => buildMultiArc(sid, 'multi_arc', c, p, s, pb) },
  { id: 'crown_arcs', group: 'Canopy', label: 'Canopy · crown', build: (sid, c, p, s, pb) => buildCrownArcs(sid, 'crown_arcs', c, p, s, pb) },
  { id: 'line_fan', group: 'Radial', label: 'Radial · fan', build: (sid, c, p, s, pb) => buildLineFan(sid, 'line_fan', c, p, s, pb) },
  { id: 'star_8', group: 'Radial', label: 'Radial · 8 rays', build: (sid, c, p, s, pb) => buildStarRays(sid, 'star_8', c, p, s, 8, pb) },
  { id: 'star_16', group: 'Radial', label: 'Radial · 16 rays', build: (sid, c, p, s, pb) => buildStarRays(sid, 'star_16', c, p, s, 16, pb) },
  { id: 'hex_web', group: 'Radial', label: 'Radial · hex + ring', build: (sid, c, p, s, pb) => buildHexWeb(sid, 'hex_web', c, p, s, pb) },
  { id: 'chaos_web', group: 'Radial', label: 'Radial · chaos web', build: (sid, c, p, s, pb) => buildChaosWeb(sid, 'chaos_web', c, p, s, pb) },
  { id: 'dot_grid', group: 'Fields & grids', label: 'Field · dot grid', build: (sid, c, p, s, pb) => buildDotGrid(sid, 'dot_grid', c, p, s, pb) },
  { id: 'scanline_haze', group: 'Fields & grids', label: 'Field · scanline haze', build: (sid, c, p, s, pb) => buildScanlineHaze(sid, 'scanline_haze', c, p, s, pb) },
  { id: 'vertical_strings', group: 'Fields & grids', label: 'Field · vertical strings', build: (sid, c, p, s, pb) => buildVerticalStrings(sid, 'vertical_strings', c, p, s, pb) },
  { id: 'grid_cross', group: 'Fields & grids', label: 'Field · cross grid', build: (sid, c, p, s, pb) => buildGridCross(sid, 'grid_cross', c, p, s, pb) },
  { id: 'weave_hatch', group: 'Fields & grids', label: 'Field · diagonal weave', build: (sid, c, p, s, pb) => buildWeaveHatch(sid, 'weave_hatch', c, p, s, pb) },
  { id: 'chevron_field', group: 'Fields & grids', label: 'Field · chevron', build: (sid, c, p, s, pb) => buildChevronField(sid, 'chevron_field', c, p, s, pb) },
  { id: 'aurora_veils', group: 'Atmosphere', label: 'Atmos · aurora veils', build: (sid, c, p, s, pb) => buildAuroraVeils(sid, 'aurora_veils', c, p, s, pb) },
  { id: 'tunnel_vanish', group: 'Atmosphere', label: 'Atmos · tunnel to crowd', build: (sid, c, p, s, pb) => buildTunnelVanish(sid, 'tunnel_vanish', c, p, s, pb) },
  { id: 'rain_shear', group: 'Atmosphere', label: 'Atmos · rain shear', build: (sid, c, p, s, pb) => buildRainShear(sid, 'rain_shear', c, p, s, pb) },
  { id: 'parabolic_fountain', group: 'Atmosphere', label: 'Atmos · fountain arcs', build: (sid, c, p, s, pb) => buildParabolicFountain(sid, 'parabolic_fountain', c, p, s, pb) },
  { id: 'shooting_stars', group: 'Atmosphere', label: 'Atmos · shooting streaks', build: (sid, c, p, s, pb) => buildShootingStars(sid, 'shooting_stars', c, p, s, pb) },
  { id: 'silk_ribbon', group: 'Organic', label: 'Organic · silk ribbon', build: (sid, c, p, s, pb) => buildSilkRibbon(sid, 'silk_ribbon', c, p, s, pb) },
  { id: 'lightning_jag', group: 'Organic', label: 'Organic · lightning', build: (sid, c, p, s, pb) => buildLightningJag(sid, 'lightning_jag', c, p, s, pb) },
  { id: 'celtic_knot_hint', group: 'Organic', label: 'Organic · knot wander', build: (sid, c, p, s, pb) => buildCelticKnotHint(sid, 'celtic_knot_hint', c, p, s, pb) },
  { id: 'mandel_step', group: 'Organic', label: 'Organic · mandala step', build: (sid, c, p, s, pb) => buildMandelStep(sid, 'mandel_step', c, p, s, pb) },
  { id: 'square_frame', group: 'Frames', label: 'Frame · square', build: (sid, c, p, s, pb) => buildSquareFrame(sid, 'square_frame', c, p, s, pb) },
  { id: 'nested_squares', group: 'Frames', label: 'Frame · nested squares', build: (sid, c, p, s, pb) => buildNestedSquares(sid, 'nested_squares', c, p, s, pb) },
  { id: 'diamond', group: 'Frames', label: 'Frame · diamond', build: (sid, c, p, s, pb) => buildDiamond(sid, 'diamond', c, p, s, pb) },
  { id: 'pentagram', group: 'Frames', label: 'Frame · pentagram', build: (sid, c, p, s, pb) => buildPentagramOutline(sid, 'pentagram', c, p, s, pb) },
  { id: 'cross_hairs', group: 'Frames', label: 'Frame · cross', build: (sid, c, p, s, pb) => buildCrossHairs(sid, 'cross_hairs', c, p, s, pb) },
  { id: 'circle_orbit', group: 'Rings', label: 'Ring · circle', build: (sid, c, p, s, pb) => buildCircleOrbit(sid, 'circle_orbit', c, p, s, pb) },
  { id: 'concentric_rings', group: 'Rings', label: 'Ring · concentric', build: (sid, c, p, s, pb) => buildConcentricRings(sid, 'concentric_rings', c, p, s, pb) },
  { id: 'breathing_circle', group: 'Rings', label: 'Ring · breathing', build: (sid, c, p, s, pb) => buildBreathingCircle(sid, 'breathing_circle', c, p, s, pb) },
]

export function resolveLaserPresetLayers(
  presetId: string | undefined,
  stableSceneId: string,
  colorHex: string,
  params: Partial<LaserPresetParams> | undefined,
  split: LaserPresetSplitPin | undefined,
  playback01: number
): LaserShapeLayer[] {
  const merged: LaserPresetParams = {
    ...DEFAULT_LASER_PRESET_PARAMS,
    ...params,
  }
  const def =
    LASER_PRESET_CATALOG.find((x) => x.id === presetId) ?? LASER_PRESET_CATALOG[0]
  return def!.build(stableSceneId, colorHex, merged, split, playback01)
}
