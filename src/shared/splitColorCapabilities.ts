import {
  approximateStandardColor,
  getColorPreview,
  inferColorKind,
  type ColorKind,
} from './dmxColors'
import {
  fixtureChannelLeafChannels,
  isMoverFixtureType,
  type ChannelColorMap,
  type FixtureType,
  type Universe,
} from './dmxFixtures'
import { listColorMapSlots } from './dmxUtil'
import type { SceneGroups } from './sceneGroups'
import { evaluateSceneGroups } from './sceneGroups'

export type SplitColorControlMode = 'hsb' | 'colorWheelOnly' | 'colorWheelAndRgb'

export type ColorWheelSlot = {
  index: number
  label: string
  preview: string
  hue: number
  saturation: number
}

export type SplitColorCapabilities = {
  mode: SplitColorControlMode
  hasColorMap: boolean
  hasChromaticRgb: boolean
  slotCount: number
  slots: ColorWheelSlot[]
}

function colorMapSlotLabel(
  color: { hue: number; saturation: number; kind?: ColorKind },
  index: number
): string {
  const standard = approximateStandardColor({
    hue: color.hue,
    saturation: color.saturation,
    kind: color.kind,
  })
  if (standard !== null) {
    return standard
  }
  const kind = color.kind ?? inferColorKind(color)
  if (kind === 'white') return 'White'
  if (kind === 'warmWhite') return 'Warm White'
  if (kind === 'amber') return 'Amber'
  if (kind === 'uv') return 'UV'
  return `Color ${index + 1}`
}

function slotsFromColorMapChannel(channel: ChannelColorMap): ColorWheelSlot[] {
  return listColorMapSlots(channel).map((slot, index) => ({
    index,
    label: colorMapSlotLabel(slot, index),
    preview: getColorPreview({
      hue: slot.hue,
      saturation: slot.saturation,
      kind: slot.kind,
    }),
    hue: slot.hue,
    saturation: slot.saturation,
  }))
}

function fixtureHasChromaticRgb(fixtureType: FixtureType): boolean {
  return fixtureType.channels
    .flatMap((channel) => fixtureChannelLeafChannels(channel))
    .some(
      (leaf) => leaf.type === 'color' && inferColorKind(leaf.color) === 'color'
    )
}

function fixtureHasColorMap(fixtureType: FixtureType): boolean {
  return fixtureType.channels
    .flatMap((channel) => fixtureChannelLeafChannels(channel))
    .some((leaf) => leaf.type === 'colorMap')
}

function pickRichestColorMapChannel(
  fixtureType: FixtureType
): ChannelColorMap | null {
  let best: ChannelColorMap | null = null
  let bestCount = 0

  for (const leaf of fixtureType.channels.flatMap((channel) =>
    fixtureChannelLeafChannels(channel)
  )) {
    if (leaf.type !== 'colorMap') continue
    const count = leaf.colors.length
    if (count > bestCount) {
      best = leaf
      bestCount = count
    }
  }

  return best
}

export type SplitColorCapabilitiesContext = {
  universe: Universe
  fixtureTypesByID: { [id: string]: FixtureType | undefined }
}

export function getSplitColorCapabilities(
  dmx: SplitColorCapabilitiesContext,
  splitGroups: SceneGroups,
  atmosFixtureIdSet: Set<string>
): SplitColorCapabilities {
  let hasColorMap = false
  let hasChromaticRgb = false
  let richestColorMap: ChannelColorMap | null = null
  let richestSlotCount = 0

  for (const fixture of dmx.universe) {
    const fixtureType = dmx.fixtureTypesByID[fixture.type]
    if (fixtureType === undefined) continue

    const groupedFixture = new Set(
      fixture.groups
        .map((group) => group.trim())
        .filter((group) => group.length > 0)
    )
    const isAtmosFixture =
      typeof fixture.id === 'string' &&
      fixture.id.trim().length > 0 &&
      atmosFixtureIdSet.has(fixture.id)
    const isMoverFixture = isMoverFixtureType(fixtureType)

    const matchesSplit = evaluateSceneGroups(splitGroups, (group) => {
      const normalized = group.trim()
      if (normalized.length <= 0) return false
      if (normalized === 'Visualizer') return false
      if (normalized === 'Movers') return isMoverFixture
      if (normalized === 'Atmosphere') return isAtmosFixture
      return groupedFixture.has(normalized)
    })
    if (!matchesSplit) continue

    if (fixtureHasColorMap(fixtureType)) {
      hasColorMap = true
      const channel = pickRichestColorMapChannel(fixtureType)
      if (channel !== null && channel.colors.length > richestSlotCount) {
        richestColorMap = channel
        richestSlotCount = channel.colors.length
      }
    }
    if (fixtureHasChromaticRgb(fixtureType)) {
      hasChromaticRgb = true
    }
  }

  const slots =
    richestColorMap !== null ? slotsFromColorMapChannel(richestColorMap) : []

  let mode: SplitColorControlMode = 'hsb'
  if (hasColorMap) {
    mode = hasChromaticRgb ? 'colorWheelAndRgb' : 'colorWheelOnly'
  }

  return {
    mode,
    hasColorMap,
    hasChromaticRgb,
    slotCount: slots.length,
    slots,
  }
}

export function splitSupportsColorWheel(
  capabilities: SplitColorCapabilities
): boolean {
  return (
    capabilities.hasColorMap &&
    capabilities.slotCount > 0 &&
    capabilities.mode !== 'hsb'
  )
}
