import { findClosest, lerp, Normalized } from '../math/util'
import { Params } from './params'

export type StandardColor = 'red' | 'green' | 'blue' | 'white'

export type Color = StandardColor | CustomColorChannel

type RGB = [number, number, number]

export const colorList = ['red', 'green', 'blue', 'white']

export type StandardColors = { [key in StandardColor]: Normalized }

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

// https://en.wikipedia.org/wiki/HSL_and_HSV
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

export function getStandardColors(params: Params): StandardColors {
  const [r, g, b] = hsv2rgb(
    params.hue ?? 0,
    params.saturation ?? 0,
    params.brightness ?? 0
  )

  return {
    red: r,
    green: g,
    blue: b,
    // The min of r g b represents a little bit of white
    white: Math.min(r, g, b),
  }
}

interface CustomColorChannel {
  hue: Normalized
  saturation: Normalized
}

/// Handles channels of any hue
function hueLevelFactor(hue: Normalized, channelHue: Normalized): Normalized {
  const RUN = 1.0 / 3.0

  const hueDelta = Math.min(
    Math.abs(channelHue - hue),
    channelHue + 1 - hue,
    hue - (channelHue - 1)
  )

  return 1 - Math.min(hueDelta, RUN) / RUN
}

/// Scale down the channel if it contributes more white than the color calls for
function saturationLevelFactor(
  saturation: Normalized,
  channelSaturation: Normalized
): Normalized {
  const white = 1.0 - saturation
  const channelWhite = 1.0 - channelSaturation
  return Math.min(white / channelWhite, 1.0)
}

/// My best guess at handling channels of any hue & saturation
export function getCustomColor(params: Params, channel: CustomColorChannel) {
  const hue = params.hue ?? 0
  const saturation = params.saturation ?? 0
  const brightness = params.brightness ?? 0

  const hlf = hueLevelFactor(hue, channel.hue)

  const saturationCorrectedHueLevelFactor = lerp(1.0, hlf, saturation)

  return (
    brightness *
    saturationCorrectedHueLevelFactor *
    saturationLevelFactor(saturation, channel.saturation)
  )
}

const hueNames: [Normalized, string][] = [
  [0.0, 'Red'],
  [0.16, 'Yellow'],
  [0.33, 'Green'],
  [0.5, 'Cyan'],
  [0.66, 'Blue'],
  [0.83, 'Magenta'],
  [1.0, 'Red'],
]

export function getHueName(hue: Normalized): string {
  return findClosest(hueNames, hue) ?? 'Error'
}

const customColorNames: [Normalized, (hueName: string) => string][] = [
  [0.0, (hueName) => hueName],
  [0.5, (hueName) => `${hueName}/White`],
  [1.0, () => 'White'],
]

export function getCustomColorChannelName(channel: CustomColorChannel) {
  const f = findClosest(customColorNames, channel.saturation) ?? (() => 'Error')
  return f(getHueName(channel.hue))
}
