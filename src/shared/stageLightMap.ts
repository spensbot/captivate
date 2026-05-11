import { lerp, clampNormalized } from '../math/util'
import type { LightScene_t } from './Scenes'
import type { Params } from './params'
import { getParam } from './params'
import type { Window2D_t } from './window'
import type { FlattenedFixture } from './dmxFixtures'

/** Downsampled grid sent from the visualizer for pixel-style stage mapping. */
export const STAGE_LIGHT_MAP_TARGET_PIXELS = 48 * 27

/**
 * Raster dimensions for the stage light map: matches the visualizer preview aspect
 * (16:9 or 4:3) so sampling stays uniform with the on-screen image (~constant cell count).
 */
export function stageLightMapGridDimensions(
  previewAspectRatio: '16:9' | '4:3'
): { width: number; height: number } {
  const aspect = previewAspectRatio === '4:3' ? 4 / 3 : 16 / 9
  const h = Math.max(
    8,
    Math.round(Math.sqrt(STAGE_LIGHT_MAP_TARGET_PIXELS / aspect))
  )
  const w = Math.max(8, Math.round(h * aspect))
  return { width: w, height: h }
}

export type StageLightMapGrid = {
  width: number
  height: number
  /** RGBA8, length width * height * 4, row-major; first row is WebGL bottom. */
  rgba: Uint8Array
}

function findVisualizerSplitIndex(scene: LightScene_t): number {
  for (let i = 0; i < scene.splitScenes.length; i++) {
    const groups = scene.splitScenes[i]?.groups ?? {}
    if (groups['Visualizer'] === true) {
      return i
    }
  }
  for (let i = 0; i < scene.splitScenes.length; i++) {
    const groups = scene.splitScenes[i]?.groups ?? {}
    const entries = Object.entries(groups)
    if (entries.length === 0) continue
    const on = entries.filter(([, v]) => v === true).map(([k]) => k)
    const off = entries.filter(([, v]) => v === false).map(([k]) => k)
    if (on.some((g) => g === 'Visualizer')) return i
    if (off.some((g) => g !== 'Visualizer')) return i
  }
  return 0
}

export function getVisualizerDriverOutputParams(
  scene: LightScene_t,
  splitStates: Array<{ outputParams: Params } | undefined>
): Params {
  const ix = findVisualizerSplitIndex(scene)
  return splitStates[ix]?.outputParams ?? splitStates[0]?.outputParams ?? {}
}

export function effectLinkValueVisSliders(source: string, params: Params): number {
  const match = /^visSlider([1-8])$/.exec(source)
  if (match !== null) {
    const key = `visSlider${match[1]}` as const
    return clampNormalized(Number(params[key] ?? 0.5))
  }
  return 1
}

export function stageLightMapMasterFromEffects(
  effects: Array<{
    enabled: boolean
    type: string
    amount: number
    linkSource: string
  }>,
  driverParams: Params
): number {
  let sum = 0
  for (const e of effects) {
    if (!e.enabled || e.type !== 'stageLightMap') continue
    const resolved =
      e.linkSource === 'none'
        ? e.amount
        : effectLinkValueVisSliders(e.linkSource, driverParams)
    sum += clampNormalized(Number(resolved) || 0)
  }
  return clampNormalized(sum)
}

/**
 * Map fixture center on the stage into UV over the visualizer frame, using the split's
 * XY moving window as a crop (same center + span semantics as DMX `getMovingWindow`).
 */
export function textureUvFromFixtureAndCrop(
  fixtureWindow: Window2D_t,
  crop2d: Window2D_t
): { u: number; v: number } {
  const fx = clampNormalized(fixtureWindow.x?.pos ?? 0.5)
  const fy = clampNormalized(fixtureWindow.y?.pos ?? 0.5)
  const cx = crop2d.x !== undefined ? clampNormalized(crop2d.x.pos) : 0.5
  const wx =
    crop2d.x !== undefined
      ? Math.max(1e-4, clampNormalized(crop2d.x.width))
      : 1.0
  const xMin = clampNormalized(cx - wx / 2)
  const xMax = clampNormalized(cx + wx / 2)
  const spanX = Math.max(1e-4, xMax - xMin)
  const cy = crop2d.y !== undefined ? clampNormalized(crop2d.y.pos) : 0.5
  const wy =
    crop2d.y !== undefined
      ? Math.max(1e-4, clampNormalized(crop2d.y.width))
      : 1.0
  const yMin = clampNormalized(cy - wy / 2)
  const yMax = clampNormalized(cy + wy / 2)
  const spanY = Math.max(1e-4, yMax - yMin)
  return {
    u: clampNormalized((fx - xMin) / spanX),
    v: clampNormalized((fy - yMin) / spanY),
  }
}

/** Bilinear sample; `v` is 0 bottom / 1 top of stage → maps to readPixels row order. */
export function sampleRgbFromStageLightGrid(
  grid: StageLightMapGrid,
  fixtureWindow: Window2D_t,
  crop2d: Window2D_t
): { r: number; g: number; b: number } {
  const { u, v } = textureUvFromFixtureAndCrop(fixtureWindow, crop2d)
  const w = grid.width
  const h = grid.height
  if (w <= 0 || h <= 0 || grid.rgba.length < w * h * 4) {
    return { r: 0, g: 0, b: 0 }
  }
  const fx = u * (w - 1)
  const fyTop = v * (h - 1)
  const fy = (h - 1) - fyTop
  const x0 = Math.floor(fx)
  const y0 = Math.floor(fy)
  const x1 = Math.min(w - 1, x0 + 1)
  const y1 = Math.min(h - 1, y0 + 1)
  const tx = fx - x0
  const ty = fy - y0

  const at = (x: number, y: number) => {
    const i = (y * w + x) * 4
    return {
      r: grid.rgba[i] / 255,
      g: grid.rgba[i + 1] / 255,
      b: grid.rgba[i + 2] / 255,
    }
  }
  const c00 = at(x0, y0)
  const c10 = at(x1, y0)
  const c01 = at(x0, y1)
  const c11 = at(x1, y1)
  const r =
    c00.r * (1 - tx) * (1 - ty) +
    c10.r * tx * (1 - ty) +
    c01.r * (1 - tx) * ty +
    c11.r * tx * ty
  const g =
    c00.g * (1 - tx) * (1 - ty) +
    c10.g * tx * (1 - ty) +
    c01.g * (1 - tx) * ty +
    c11.g * tx * ty
  const b =
    c00.b * (1 - tx) * (1 - ty) +
    c10.b * tx * (1 - ty) +
    c01.b * (1 - tx) * ty +
    c11.b * tx * ty
  return { r, g, b }
}

/** Map linear RGB 0–1 to Captivate-style H/S/B (all 0–1). */
export function rgbToCaptivateHsb(r: number, g: number, b: number) {
  const rn = clampNormalized(r)
  const gn = clampNormalized(g)
  const bn = clampNormalized(b)
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let hue = 0
  if (d > 1e-5) {
    if (max === rn) {
      hue = ((gn - bn) / d) % 6
    } else if (max === gn) {
      hue = (bn - rn) / d + 2
    } else {
      hue = (rn - gn) / d + 4
    }
    hue /= 6
    if (hue < 0) hue += 1
  }
  const saturation = max < 1e-5 ? 0 : d / max
  const brightness = max
  return { hue, saturation, brightness }
}

export function mergeParamsWithStageLightSample(
  base: Params,
  fixture: FlattenedFixture,
  grid: StageLightMapGrid,
  mix: number,
  crop2d: Window2D_t
): Params {
  const m = clampNormalized(mix)
  if (m <= 0.0005) return base
  const { r, g, b } = sampleRgbFromStageLightGrid(grid, fixture.window, crop2d)
  const sample = rgbToCaptivateHsb(r, g, b)
  return {
    ...base,
    hue: lerp(getParam(base, 'hue'), sample.hue, m),
    saturation: lerp(getParam(base, 'saturation'), sample.saturation, m),
    brightness: lerp(getParam(base, 'brightness'), sample.brightness, m),
  }
}
