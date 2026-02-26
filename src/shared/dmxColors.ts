import { clampNormalized, findClosest, lerp, Normalized } from '../math/util'

export type ColorKind = 'color' | 'white' | 'warmWhite' | 'amber' | 'uv'

export interface ColorChannel {
  hue: Normalized
  saturation: Normalized
  kind?: ColorKind
}

const DEFAULT_AMBER_HUE = 0.11
const DEFAULT_UV_HUE = 0.74
const DEFAULT_WARM_WHITE_SATURATION = 0.2

function circularHueDelta(a: Normalized, b: Normalized): number {
  return Math.min(Math.abs(a - b), Math.abs(a + 1 - b), Math.abs(a - (b + 1)))
}

function hueAffinity(
  hue: Normalized,
  targetHue: Normalized,
  width: number
): number {
  return clampNormalized(1 - circularHueDelta(hue, targetHue) / width)
}

export function inferColorKind(channel: ColorChannel): ColorKind {
  if (channel.kind !== undefined) {
    return channel.kind
  }
  if (channel.saturation < 0.02) {
    return 'white'
  }
  return 'color'
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
  if (channelWhite < 0.01) {
    return 1.0
  }
  return Math.min(white / channelWhite, 1.0)
}

/// My best guess at handling channels of any hue & saturation
export function getColorChannelLevel(
  hue: Normalized,
  saturation: Normalized,
  brightness: Normalized,
  channel: ColorChannel
) {
  const kind = inferColorKind(channel)
  if (kind === 'white') {
    return brightness * (1.0 - saturation)
  }
  if (kind === 'warmWhite') {
    const white = 1.0 - saturation
    const warmHue = hueAffinity(hue, DEFAULT_AMBER_HUE, 0.24)
    const level =
      white * 0.85 + warmHue * white * 0.35 + warmHue * saturation * 0.15
    return brightness * clampNormalized(level)
  }
  if (kind === 'amber') {
    const amberHue = hueAffinity(hue, DEFAULT_AMBER_HUE, 0.18)
    const level = amberHue * lerp(0.2, 1.0, saturation)
    return brightness * clampNormalized(level)
  }
  if (kind === 'uv') {
    const uvHue = hueAffinity(hue, DEFAULT_UV_HUE, 0.2)
    const level = uvHue * lerp(0.15, 1.0, saturation)
    return brightness * clampNormalized(level)
  }

  const hlf = hueLevelFactor(hue, channel.hue)

  const saturationCorrectedHueLevelFactor = lerp(1.0, hlf, saturation)

  return (
    brightness *
    saturationCorrectedHueLevelFactor *
    saturationLevelFactor(saturation, channel.saturation)
  )
}

type StandardHueName = 'Red' | 'Yellow' | 'Green' | 'Cyan' | 'Blue' | 'Magenta'
type SpecialColorName = 'White' | 'Warm White' | 'Amber' | 'UV'

export const huesByName: { [key in StandardHueName]: Normalized } = {
  Red: 0.0,
  Yellow: 0.166,
  Green: 0.333,
  Cyan: 0.5,
  Blue: 0.666,
  Magenta: 0.833,
}

const hueNames: [StandardHueName, Normalized][] = [
  ['Red', 0.0],
  ['Yellow', 0.16],
  ['Green', 0.33],
  ['Cyan', 0.5],
  ['Blue', 0.66],
  ['Magenta', 0.83],
  ['Red', 1.0],
]

function getHueName(hue: Normalized): string {
  return findClosest(hueNames, hue) ?? 'Error'
}

const colorChannelNames: [(hueName: string) => string, Normalized][] = [
  [() => 'White', 0.0],
  [(hueName) => `${hueName}/White`, 0.5],
  [(hueName) => hueName, 1.0],
]

export function getCustomColorChannelName(channel: ColorChannel) {
  const kind = inferColorKind(channel)
  if (kind === 'white') {
    return 'White'
  }
  if (kind === 'warmWhite') {
    return 'Warm White'
  }
  if (kind === 'amber') {
    return 'Amber'
  }
  if (kind === 'uv') {
    return 'UV'
  }

  const f =
    findClosest(colorChannelNames, channel.saturation) ?? (() => 'Error')
  return f(getHueName(channel.hue))
}

type StandardColorName = StandardHueName | SpecialColorName

export const standardColorNames: StandardColorName[] = [
  'Red',
  'Yellow',
  'Green',
  'Cyan',
  'Blue',
  'Magenta',
  'White',
  'Warm White',
  'Amber',
  'UV',
]

export function colorByName(color: StandardColorName): ColorChannel {
  if (color === 'White') {
    return { kind: 'white', hue: 0, saturation: 0 }
  } else if (color === 'Warm White') {
    return {
      kind: 'warmWhite',
      hue: DEFAULT_AMBER_HUE,
      saturation: DEFAULT_WARM_WHITE_SATURATION,
    }
  } else if (color === 'Amber') {
    return { kind: 'amber', hue: DEFAULT_AMBER_HUE, saturation: 1.0 }
  } else if (color === 'UV') {
    return { kind: 'uv', hue: DEFAULT_UV_HUE, saturation: 1.0 }
  } else {
    return { kind: 'color', hue: huesByName[color], saturation: 1.0 }
  }
}

export function approximateStandardColor(
  color: ColorChannel
): StandardColorName | null {
  const kind = inferColorKind(color)
  if (kind === 'warmWhite') return 'Warm White'
  if (kind === 'amber') return 'Amber'
  if (kind === 'uv') return 'UV'
  if (kind === 'white') return 'White'

  const delta = 0.02
  if (color.saturation < delta) {
    return 'White'
  } else if (1.0 - color.saturation < delta) {
    for (const [name, hue] of hueNames) {
      if (Math.abs(hue - color.hue) < delta) {
        return name
      }
    }
  }
  return null
}

export function getColorChannelDistance(
  hue: Normalized,
  saturation: Normalized,
  channel: ColorChannel
): number {
  const kind = inferColorKind(channel)
  if (kind === 'white') {
    return saturation
  }
  if (kind === 'warmWhite') {
    const warmHueDistance = circularHueDelta(hue, DEFAULT_AMBER_HUE) / 0.5
    const warmSatDistance = Math.abs(saturation - DEFAULT_WARM_WHITE_SATURATION)
    return warmSatDistance * 0.65 + warmHueDistance * 0.35
  }
  if (kind === 'amber') {
    const amberHueDistance = circularHueDelta(hue, DEFAULT_AMBER_HUE) / 0.5
    return amberHueDistance * 0.8 + Math.abs(1.0 - saturation) * 0.2
  }
  if (kind === 'uv') {
    const uvHueDistance = circularHueDelta(hue, DEFAULT_UV_HUE) / 0.5
    return uvHueDistance * 0.8 + Math.abs(1.0 - saturation) * 0.2
  }

  const hueDistance = circularHueDelta(hue, channel.hue) / 0.5
  const saturationDistance = Math.abs(saturation - channel.saturation)
  return hueDistance * 0.7 + saturationDistance * 0.3
}

export function getColorPreview(channel: ColorChannel): string {
  const kind = inferColorKind(channel)
  if (kind === 'white') return '#f0f0f0'
  if (kind === 'warmWhite') return '#ffe0b2'
  if (kind === 'amber') return '#ffb300'
  if (kind === 'uv') return '#7f39fb'
  return `hsl(${channel.hue * 360}, ${channel.saturation * 100}%, ${lerp(
    100,
    50,
    channel.saturation
  )}%)`
}
