import { Normalized } from './baseTypes'
import { Params } from './params'

export enum Color {
  Red,
  Green,
  Blue,
  White,
  Black
}

export type Colors = {
  [Color.Red]: Normalized,
  [Color.Green]: Normalized,
  [Color.Blue]: Normalized,
  [Color.White]: Normalized,
  [Color.Black]: Normalized
}

// https://en.wikipedia.org/wiki/HSL_and_HSV
function hsl2rgb(h: Normalized, s: Normalized, l: Normalized) {
  const C = (1 - Math.abs(2*l - 1)) * s
  const hp = h * 6
  const X = C * (1- Math.abs(hp % 2 - 1) )

  const [r1, g1 , b1] = (() => {
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
  })()

  const m = l - C/2

  return [r1 + m, g1 + m, b1 + m]
}

export function getColors(params: Params): Colors {
  const [r, g, b] = hsl2rgb(params.Hue, params.Saturation, params.Brightness)

  return {
    [Color.Red]: r,
    [Color.Green]: g,
    [Color.Blue]: b,
    [Color.Black]: params.Black,
    [Color.White]: params.Brightness
  }
}