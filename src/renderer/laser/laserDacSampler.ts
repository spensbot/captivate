import type { LaserDacFramePoint } from '../../shared/laserDac'
import type {
  LaserRgbCapabilities,
  LaserScene,
  LaserShapeLayer,
  NormPoint,
} from './laserEditorTypes'
import {
  DEFAULT_LASER_RGB_CAPABILITIES,
  hexToRgb,
  sampleGradientHex,
  sampleRainbowHex,
} from './laserBeamColor'
import type { LaserPresetSplitPin } from './laserPresetCatalog'
import { getLaserSceneDisplayLayers } from './laserSceneDisplay'

function dist(a: NormPoint, b: NormPoint): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

function polylineLength(pts: NormPoint[]): number {
  if (pts.length < 2) return 0
  let s = 0
  for (let i = 1; i < pts.length; i++) s += dist(pts[i - 1]!, pts[i]!)
  return s
}

function samplePolyline(pts: NormPoint[], count: number): NormPoint[] {
  if (pts.length === 0) return []
  if (pts.length === 1 || count <= 1) return [{ ...pts[0]! }]
  const L = polylineLength(pts)
  if (L < 1e-8) return Array.from({ length: count }, () => ({ ...pts[0]! }))
  const out: NormPoint[] = []
  const segLens: number[] = []
  for (let i = 1; i < pts.length; i++) segLens.push(dist(pts[i - 1]!, pts[i]!))
  for (let k = 0; k < count; k++) {
    const u = count === 1 ? 0 : k / (count - 1)
    let target = u * L
    let i = 0
    while (i < segLens.length && target > segLens[i]! + 1e-9) {
      target -= segLens[i]!
      i++
    }
    const seg = segLens[i] ?? 1e-6
    const t = Math.max(0, Math.min(1, target / seg))
    const a = pts[i]!
    const b = pts[i + 1]!
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
  }
  return out
}

function strokeHexAt(
  layer: LaserShapeLayer,
  tAlong: number,
  caps: LaserRgbCapabilities,
  huePhase01: number
): string {
  const ta = Number.isFinite(tAlong) ? tAlong : 0
  const ph = Number.isFinite(huePhase01) ? huePhase01 : 0
  const t = ((ta + ph) % 1 + 1) % 1
  if (layer.beam?.kind === 'gradient') {
    return sampleGradientHex(layer.beam.stops, t, caps)
  }
  if (layer.beam?.kind === 'rainbow') {
    return sampleRainbowHex(t, layer.beam.cycles, caps)
  }
  return layer.color ?? '#ffffff'
}

function sampleLayer(
  layer: LaserShapeLayer,
  budget: number,
  caps: LaserRgbCapabilities,
  huePhase01: number
): LaserDacFramePoint[] {
  const pts = layer.points
  if (pts.length === 0) return []
  const samples = samplePolyline(pts, Math.max(2, budget))
  const denom = Math.max(1, samples.length - 1)
  return samples.map((p, i) => {
    const rgb = hexToRgb(strokeHexAt(layer, i / denom, caps, huePhase01))
    return { x: p.x, y: p.y, r: rgb[0], g: rgb[1], b: rgb[2] }
  })
}

/**
 * Flatten the active scene into DAC samples (normalized editor space).
 * Inserts short blank hops between layers to reduce cross-beam streaks.
 */
export function sampleLaserSceneForDac(
  scene: LaserScene,
  splitPin: LaserPresetSplitPin | undefined,
  animProgress: number,
  maxPoints: number,
  shapeMotionDelta?: { x: number; y: number },
  laserCaps: LaserRgbCapabilities = DEFAULT_LASER_RGB_CAPABILITIES,
  huePhase01 = 0
): LaserDacFramePoint[] {
  const layers = getLaserSceneDisplayLayers(
    scene,
    splitPin,
    animProgress,
    shapeMotionDelta
  )
  if (layers.length === 0) {
    return [
      { x: 0.5, y: 0.5, r: 0, g: 0, b: 0, blank: true },
      { x: 0.5, y: 0.5, r: 0, g: 0, b: 0, blank: true },
    ]
  }
  const per = Math.max(8, Math.floor(maxPoints / Math.max(1, layers.length * 1.25)))
  const out: LaserDacFramePoint[] = []
  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li]!
    if (out.length > 0) {
      const prev = out[out.length - 1]!
      out.push({ x: prev.x, y: prev.y, r: 0, g: 0, b: 0, blank: true })
    }
    out.push(...sampleLayer(layer, per, laserCaps, huePhase01))
  }
  if (out.length > maxPoints) {
    const step = Math.ceil(out.length / maxPoints)
    const thin: LaserDacFramePoint[] = []
    for (let i = 0; i < out.length; i += step) thin.push(out[i]!)
    return thin.length >= 2 ? thin : out.slice(0, maxPoints)
  }
  return out.length >= 2 ? out : [...out, { ...out[out.length - 1]! }]
}
