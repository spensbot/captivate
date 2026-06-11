import type { ColorKind } from './dmxColors'
import { inferColorKind } from './dmxColors'
import {
  fixtureChannelLeafChannels,
  isMoverFixtureType,
  type FixtureType,
  type Universe,
} from './dmxFixtures'
import type { SceneGroups } from './sceneGroups'
import { evaluateSceneGroups } from './sceneGroups'
import type { LedFixture } from './ledFixtures'

export type AuxColorGates = {
  white: boolean
  warmWhite: boolean
  amber: boolean
  uv: boolean
}

export function auxColorParamAllowed(
  param: string,
  gates: AuxColorGates
): boolean {
  if (param === 'white') return gates.white
  if (param === 'warmWhite') return gates.warmWhite
  if (param === 'amber') return gates.amber
  if (param === 'uv') return gates.uv
  return true
}

function addKindsFromFixtureType(fixtureType: FixtureType, kinds: Set<ColorKind>) {
  for (const leaf of fixtureType.channels.flatMap((ch) =>
    fixtureChannelLeafChannels(ch)
  )) {
    if (leaf.type === 'color') {
      kinds.add(inferColorKind(leaf.color))
    } else if (leaf.type === 'colorMap') {
      for (const c of leaf.colors) {
        const kind = c.kind ?? inferColorKind({ hue: c.hue, saturation: c.saturation })
        kinds.add(kind)
      }
    }
  }
}

function ledFixtureSupportsWhite(led: LedFixture): boolean {
  const fmt = led.controller.pixel_format
  return fmt === 'rgbw' || fmt === 'auto'
}

export type SplitAuxColorDmxContext = {
  universe: Universe
  fixtureTypesByID: { [id: string]: FixtureType | undefined }
  led: { ledFixtures: LedFixture[] }
}

/**
 * Per-split: which aux color params are backed by at least one addressed fixture
 * (DMX color / colorMap slot, or RGBW / auto LED strip for white).
 */
export function getSplitAuxColorGates(
  dmx: SplitAuxColorDmxContext,
  splitGroups: SceneGroups,
  atmosFixtureIdSet: Set<string>
): AuxColorGates {
  const kinds = new Set<ColorKind>()

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

    addKindsFromFixtureType(fixtureType, kinds)
  }

  for (const ledFixture of dmx.led.ledFixtures) {
    const groupedFixture = new Set(
      ledFixture.groups.map((group) => group.trim()).filter((group) => group.length > 0)
    )
    const matchesSplit = evaluateSceneGroups(splitGroups, (group) => {
      const normalized = group.trim()
      if (normalized.length <= 0) return false
      if (normalized === 'Visualizer') return false
      if (normalized === 'LEDs' || normalized === 'Pixels') {
        return groupedFixture.has('LEDs') || groupedFixture.has('Pixels')
      }
      return groupedFixture.has(normalized)
    })
    if (!matchesSplit) continue

    if (ledFixtureSupportsWhite(ledFixture)) {
      kinds.add('white')
    }
  }

  return {
    white: kinds.has('white'),
    warmWhite: kinds.has('warmWhite'),
    amber: kinds.has('amber'),
    uv: kinds.has('uv'),
  }
}

