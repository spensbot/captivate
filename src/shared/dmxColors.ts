import { findClosest, lerp, Normalized } from '../math/util'
import { Params } from './params'

export interface ColorChannel {
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
export function getColorChannelLevel(params: Params, channel: ColorChannel) {
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

type StandardHueName = 'Red' | 'Yellow' | 'Green' | 'Cyan' | 'Blue' | 'Magenta'

export const huesByName: { [key in StandardHueName]: Normalized } = {
  Red: 0.0,
  Yellow: 0.16,
  Green: 0.33,
  Cyan: 0.5,
  Blue: 0.66,
  Magenta: 0.83,
}

const hueNames: [Normalized, StandardHueName][] = [
  [0.0, 'Red'],
  [0.16, 'Yellow'],
  [0.33, 'Green'],
  [0.5, 'Cyan'],
  [0.66, 'Blue'],
  [0.83, 'Magenta'],
  [1.0, 'Red'],
]

function getHueName(hue: Normalized): string {
  return findClosest(hueNames, hue) ?? 'Error'
}

const colorChannelNames: [Normalized, (hueName: string) => string][] = [
  [0.0, () => 'White'],
  [0.5, (hueName) => `${hueName}/White`],
  [1.0, (hueName) => hueName],
]

export function getCustomColorChannelName(channel: ColorChannel) {
  const f =
    findClosest(colorChannelNames, channel.saturation) ?? (() => 'Error')
  return f(getHueName(channel.hue))
}

type StandardColorName = StandardHueName | 'White'

export const standardColorNames: StandardColorName[] = [
  'Red',
  'Yellow',
  'Green',
  'Cyan',
  'Blue',
  'Magenta',
  'White',
]

export function colorByName(color: StandardColorName): ColorChannel {
  if (color === 'White') {
    return { hue: 0, saturation: 0 }
  } else {
    return { hue: huesByName[color], saturation: 1.0 }
  }
}

export function approximateStandardColor(
  color: ColorChannel
): StandardColorName | null {
  const delta = 0.02
  if (color.saturation < delta) {
    return 'White'
  } else if (1.0 - color.saturation < delta) {
    for (const [hue, name] of hueNames) {
      if (Math.abs(hue - color.hue) < delta) {
        return name
      }
    }
  }
  return null
}
