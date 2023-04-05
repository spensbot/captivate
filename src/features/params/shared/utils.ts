import { BaseColors, hsv2rgb } from 'features/utils/baseColors'
import { Params } from './params'

export function getBaseColors(params: Partial<Params>): BaseColors {
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
