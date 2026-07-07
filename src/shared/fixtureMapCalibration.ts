import {
  ChannelColorMap,
  ChannelGoboMap,
  ChannelPrismMap,
  DMX_MAX_VALUE,
  DMX_MIN_VALUE,
  FixtureChannel,
  GoboMapItem,
} from './dmxFixtures'

export type MapCalibrationOverride = {
  fixtureTypeId: string
  channelIndex: number
  dmxValue: number
}

function clampDmxValue(value: number, fallback: number = 0): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(DMX_MAX_VALUE, Math.max(DMX_MIN_VALUE, Math.round(value)))
}

export function getColorMapSlotPreviewDmxValue(
  colors: ChannelColorMap['colors'],
  activeColorIndex: number
): number {
  if (colors.length === 0) return DMX_MIN_VALUE

  const sorted = colors
    .map((color, index) => ({
      index,
      max: clampDmxValue(color.max),
    }))
    .sort((left, right) => left.max - right.max)

  const sortedIndex = sorted.findIndex((entry) => entry.index === activeColorIndex)
  if (sortedIndex === -1) {
    return sorted[0]?.max ?? DMX_MIN_VALUE
  }

  const entry = sorted[sortedIndex]
  const previousMax = sortedIndex > 0 ? sorted[sortedIndex - 1].max : DMX_MIN_VALUE - 1
  const rangeMin = Math.min(DMX_MAX_VALUE, Math.max(DMX_MIN_VALUE, previousMax + 1))
  const rangeMax = Math.min(DMX_MAX_VALUE, Math.max(rangeMin, entry.max))

  if (rangeMin >= rangeMax) {
    return rangeMax
  }

  return Math.round((rangeMin + rangeMax) / 2)
}

export function getWheelMapSlotPreviewDmxValue(
  slots: GoboMapItem[],
  activeIndex: number
): number {
  if (slots.length === 0) return DMX_MIN_VALUE

  const sorted = slots
    .map((slot, index) => ({
      index,
      max: clampDmxValue(slot.max),
    }))
    .sort((left, right) => left.max - right.max)

  const sortedIndex = sorted.findIndex((entry) => entry.index === activeIndex)
  if (sortedIndex === -1) {
    return sorted[0]?.max ?? DMX_MIN_VALUE
  }

  const entry = sorted[sortedIndex]
  const previousMax = sortedIndex > 0 ? sorted[sortedIndex - 1].max : DMX_MIN_VALUE - 1
  const rangeMin = Math.min(DMX_MAX_VALUE, Math.max(DMX_MIN_VALUE, previousMax + 1))
  const rangeMax = Math.min(DMX_MAX_VALUE, Math.max(rangeMin, entry.max))

  if (rangeMin >= rangeMax) {
    return rangeMax
  }

  return Math.round((rangeMin + rangeMax) / 2)
}

export function fixtureChannelHasColorMap(channel: FixtureChannel): boolean {
  if (channel.type === 'colorMap') return true
  if (channel.type === 'split') {
    return channel.ranges.some((range) => range.channel.type === 'colorMap')
  }
  return false
}

export function fixtureChannelHasGoboMap(channel: FixtureChannel): boolean {
  if (channel.type === 'goboMap') return true
  if (channel.type === 'split') {
    return channel.ranges.some((range) => range.channel.type === 'goboMap')
  }
  return false
}

export function fixtureChannelHasPrismMap(channel: FixtureChannel): boolean {
  if (channel.type === 'prismMap') return true
  if (channel.type === 'split') {
    return channel.ranges.some((range) => range.channel.type === 'prismMap')
  }
  return false
}

export function getFixtureMapCalibrationOverrideValue(
  fixtureTypeId: string | undefined,
  fixtureTypeChannels: FixtureChannel[] | undefined,
  channel: FixtureChannel,
  overrides: Array<{
    override: MapCalibrationOverride | null
    predicate: (channel: FixtureChannel) => boolean
  }>
): number | undefined {
  if (fixtureTypeId === undefined || fixtureTypeChannels === undefined) {
    return undefined
  }

  for (const { override, predicate } of overrides) {
    if (override === null || override.fixtureTypeId !== fixtureTypeId) {
      continue
    }

    const expectedChannel = fixtureTypeChannels[override.channelIndex]
    if (expectedChannel === undefined || channel !== expectedChannel) {
      continue
    }
    if (!predicate(expectedChannel)) {
      continue
    }

    return clampDmxValue(override.dmxValue, DMX_MIN_VALUE)
  }

  return undefined
}

export function getGoboMapPreviewDmxValue(
  gobos: ChannelGoboMap['gobos'],
  activeIndex: number
): number {
  return getWheelMapSlotPreviewDmxValue(gobos, activeIndex)
}

export function getPrismMapPreviewDmxValue(
  prisms: ChannelPrismMap['prisms'],
  activeIndex: number
): number {
  return getWheelMapSlotPreviewDmxValue(prisms, activeIndex)
}
