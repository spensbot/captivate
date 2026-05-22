import type {
  BeamGradientStop,
  LaserRgbCapabilities,
} from './laserEditorTypes'

export const DEFAULT_LASER_RGB_CAPABILITIES: LaserRgbCapabilities = {
  red: true,
  green: true,
  blue: true,
  yellow: true,
  white: true,
}

/** Preset gradients using RGBY-friendly hues (saturated, laser-like). */
export const BEAM_GRADIENT_PRESETS: { id: string; name: string; stops: BeamGradientStop[] }[] =
  [
    {
      id: 'rg',
      name: 'RG sweep',
      stops: [
        { offset: 0, color: '#ff2020' },
        { offset: 1, color: '#20ff40' },
      ],
    },
    {
      id: 'rgb',
      name: 'RGB',
      stops: [
        { offset: 0, color: '#ff2020' },
        { offset: 0.5, color: '#20ff40' },
        { offset: 1, color: '#2080ff' },
      ],
    },
    {
      id: 'ryb',
      name: 'RYB',
      stops: [
        { offset: 0, color: '#ffcc00' },
        { offset: 0.5, color: '#ff2020' },
        { offset: 1, color: '#2080ff' },
      ],
    },
    {
      id: 'fire',
      name: 'Fire',
      stops: [
        { offset: 0, color: '#ffff40' },
        { offset: 0.45, color: '#ff8000' },
        { offset: 1, color: '#ff1020' },
      ],
    },
    {
      id: 'ice',
      name: 'Ice',
      stops: [
        { offset: 0, color: '#40ffff' },
        { offset: 0.55, color: '#2080ff' },
        { offset: 1, color: '#c080ff' },
      ],
    },
  ]

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim()
  const v =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h.padEnd(6, '0').slice(0, 6)
  const n = parseInt(v, 16)
  if (Number.isNaN(n)) return [0, 0, 0]
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (x: number) =>
    Math.max(0, Math.min(255, Math.round(x * 255)))
    .toString(16)
    .padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function lerpRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

/** Non-negative blend onto available laser primaries (RGB + yellow + white). */
export function gateRgbForLaser(
  rgb: [number, number, number],
  caps: LaserRgbCapabilities
): [number, number, number] {
  const t = rgb.map((v) => Math.max(0, Math.min(1, v))) as [number, number, number]
  type V3 = [number, number, number]
  const cols: V3[] = []
  if (caps.red) cols.push([1, 0, 0])
  if (caps.green) cols.push([0, 1, 0])
  if (caps.blue) cols.push([0, 0, 1])
  if (caps.yellow) {
    const y: V3 = [1, 1, 0]
    const m = Math.max(y[0], y[1], y[2], 1e-9)
    cols.push([y[0] / m, y[1] / m, y[2] / m])
  }
  if (caps.white) {
    const w: V3 = [1, 1, 1]
    const m = Math.sqrt(3)
    cols.push([w[0] / m, w[1] / m, w[2] / m])
  }
  if (cols.length === 0) return [0, 0, 0]

  let w = cols.map(() => 1 / cols.length)
  for (let iter = 0; iter < 96; iter++) {
    const pred: V3 = [0, 0, 0]
    for (let i = 0; i < cols.length; i++) {
      pred[0] += w[i] * cols[i][0]
      pred[1] += w[i] * cols[i][1]
      pred[2] += w[i] * cols[i][2]
    }
    const err: V3 = [t[0] - pred[0], t[1] - pred[1], t[2] - pred[2]]
    for (let i = 0; i < cols.length; i++) {
      const g =
        err[0] * cols[i][0] + err[1] * cols[i][1] + err[2] * cols[i][2]
      w[i] = Math.max(0, w[i] + 0.1 * g)
    }
    const s = w.reduce((a, b) => a + b, 0) || 1
    w = w.map((x) => x / s)
  }
  let out: V3 = [0, 0, 0]
  for (let i = 0; i < cols.length; i++) {
    out[0] += w[i] * cols[i][0]
    out[1] += w[i] * cols[i][1]
    out[2] += w[i] * cols[i][2]
  }
  const peak = Math.max(out[0], out[1], out[2], 1e-9)
  const targetPeak = Math.max(t[0], t[1], t[2], 1e-9)
  const sc = targetPeak / peak
  return [
    Math.min(1, Math.max(0, out[0] * sc)),
    Math.min(1, Math.max(0, out[1] * sc)),
    Math.min(1, Math.max(0, out[2] * sc)),
  ]
}

export function gateHexForLaser(hex: string, caps: LaserRgbCapabilities): string {
  const g = gateRgbForLaser(hexToRgb(hex), caps)
  return rgbToHex(g[0], g[1], g[2])
}

/** Editor preview: avoid invisible strokes on black when gating yields near-black. */
export function editorStrokeForLaser(hex: string, caps: LaserRgbCapabilities): string {
  const gated = gateHexForLaser(hex, caps)
  const rgb = hexToRgb(gated)
  const lum = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
  if (lum < 0.08) {
    return '#5ce0a8'
  }
  return gated
}

function normalizeStops(stops: BeamGradientStop[]): BeamGradientStop[] {
  const s = [...stops].sort((a, b) => a.offset - b.offset)
  return s.map((x) => ({
    offset: Math.min(1, Math.max(0, x.offset)),
    color: x.color,
  }))
}

export function sampleGradientHex(
  stops: BeamGradientStop[],
  t: number,
  caps: LaserRgbCapabilities
): string {
  let u0 = t
  if (!Number.isFinite(u0)) u0 = 0
  const s = normalizeStops(stops)
  if (s.length === 0) return '#ffffff'
  if (s.length === 1) return gateHexForLaser(s[0].color, caps)
  const u = Math.min(1, Math.max(0, u0))
  let i = 0
  while (i < s.length - 1 && s[i + 1].offset < u) i++
  const a = s[i]
  const b = s[Math.min(i + 1, s.length - 1)]
  const span = Math.max(1e-9, b.offset - a.offset)
  const local = a.offset === b.offset ? 0 : (u - a.offset) / span
  const ca = hexToRgb(a.color)
  const cb = hexToRgb(b.color)
  const mx = lerpRgb(ca, cb, local)
  return rgbToHex(...gateRgbForLaser(mx, caps))
}

export type SampleRainbowOpts = {
  /** When true, snap cycle count to a whole number so hue matches at the path closure. */
  closedStroke?: boolean
}

export function sampleRainbowHex(
  t: number,
  cycles: number,
  caps: LaserRgbCapabilities,
  opts?: SampleRainbowOpts
): string {
  const t0 = Number.isFinite(t) ? t : 0
  let cy = Number.isFinite(cycles) && cycles > 0 ? cycles : 1
  if (opts?.closedStroke) {
    cy = Math.max(1, Math.round(cy))
  }
  const u = ((t0 * Math.max(0.1, cy)) % 1 + 1) % 1
  const h = ((u * 360) % 360 + 360) % 360
  const s = 0.95
  const l = 0.52
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let rp = 0
  let gp = 0
  let bp = 0
  if (h < 60) {
    rp = c
    gp = x
  } else if (h < 120) {
    rp = x
    gp = c
  } else if (h < 180) {
    gp = c
    bp = x
  } else if (h < 240) {
    gp = x
    bp = c
  } else if (h < 300) {
    rp = x
    bp = c
  } else {
    rp = c
    bp = x
  }
  return rgbToHex(...gateRgbForLaser([rp + m, gp + m, bp + m], caps))
}

export function gradientPreviewCss(stops: BeamGradientStop[]): string {
  const s = normalizeStops(stops)
  if (s.length === 0) return 'linear-gradient(90deg,#888,#444)'
  const parts = s.map((x) => `${x.color} ${Math.round(x.offset * 100)}%`)
  return `linear-gradient(90deg,${parts.join(',')})`
}

export function gateGradientStops(
  stops: BeamGradientStop[],
  caps: LaserRgbCapabilities
): BeamGradientStop[] {
  return [...stops]
    .sort((a, b) => a.offset - b.offset)
    .map((s) => ({
      offset: Math.min(1, Math.max(0, s.offset)),
      color: gateHexForLaser(s.color, caps),
    }))
}
