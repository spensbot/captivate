import { Normalized } from './math/util'
import { Params } from '../../shared/params'

export type BaseColor = 'red' | 'green' | 'blue'

export type BaseColors = { [key in BaseColor]: Normalized }

type RGB = [number, number, number]

function intermediate(C: number, X: number, hp: Normalized) {
  if (hp < 1) {
    return [C, X, 0]
  } else if (hp < 2) {
    return [X, C, 0]
  } else if (hp < 3) {
    return [0, C, X]
  } else if (hp < 4) {
    return [0, X, C]
  } else if (hp < 5) {
    return [X, 0, C]
  } else {
    return [C, 0, X]
  }
}

//https://en.wikipedia.org/wiki/HSL_and_HSV
export function hsl2rgb(h: Normalized, s: Normalized, l: Normalized): RGB {
  const hp = h * 6
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((hp % 2) - 1))
  const [r1, g1, b1] = intermediate(c, x, hp)
  const m = l - c / 2
  return [r1 + m, g1 + m, b1 + m]
}

export function hsv2rgb(h: Normalized, s: Normalized, v: Normalized): RGB {
  const hp = h * 6
  const c = v * s
  const x = c * (1 - Math.abs((hp % 2) - 1))
  const [r1, g1, b1] = intermediate(c, x, hp)
  const m = v - c
  return [r1 + m, g1 + m, b1 + m]
}

export function hsi2rgb(h: Normalized, s: Normalized, i: Normalized): RGB {
  const hp = h * 6
  const z = 1 - Math.abs((hp % 2) - 1)
  const c = (3 * i * s) / (1 + z)
  const x = c * z
  const [r1, g1, b1] = intermediate(c, x, hp)
  const m = i * (1 - s)
  return [r1 + m, g1 + m, b1 + m]
}

export function getBaseColors(params: Params): BaseColors {
  const [r, g, b] = hsv2rgb(
    params.hue ?? 0,
    params.saturation ?? 0,
    params.brightness ?? 0
  )

  return {
    red: r,
    green: g,
    blue: b,
  }
}

export function getBaseColorsFromHsv(
  h: number,
  s: number,
  v: number
): BaseColors {
  const [r, g, b] = hsv2rgb(h, s, v)

  return {
    red: r,
    green: g,
    blue: b,
  }
}

export function separateHue(n: number, i: number) {
  const HUE_RANGE = 1
  const HUE_START = 60 / 360
  const hueDelta = HUE_RANGE / n

  return (HUE_START + i * hueDelta) % HUE_RANGE
}

export function hsvaForCss(
  h: Normalized,
  s: Normalized,
  v: Normalized,
  a: Normalized
) {
  return `hsla(${h * 360}, ${s * 100}%, ${v * 50}%, ${a})`
}
