import type { FlattenedFixture } from './dmxFixtures'
import { getFixturesInGroups } from './dmxUtil'
import {
  getLedFixturePixelCount,
  type LedFixture,
  normalizeLedFixtureForRuntime,
} from './ledFixtures'
import { applyRandomization, type RandomizerState } from './randomizer'
import type { BaseColors } from './baseColors'
import {
  ledFixtureMatchesSceneGroups,
  sceneGroupsHasExplicitInclude,
  type SceneGroups,
} from './sceneGroups'
import { getParam, type Params } from './params'

export function getLedFixturesInSceneGroups(
  ledFixtures: LedFixture[],
  sceneGroups: SceneGroups
): LedFixture[] {
  return ledFixtures
    .map((fixture) => normalizeLedFixtureForRuntime(fixture))
    .filter((fixture) => ledFixtureMatchesSceneGroups(fixture.groups, sceneGroups))
}

export function countLedRandomizerSlots(
  ledFixtures: LedFixture[],
  sceneGroups: SceneGroups
): number {
  return getLedFixturesInSceneGroups(ledFixtures, sceneGroups).reduce(
    (sum, fixture) => sum + getLedFixturePixelCount(fixture),
    0
  )
}

/** Ordered DMX fixtures that own randomizer slots for a split (must match engine consume). */
export function getDmxRandomizerFixtures(
  fixtures: FlattenedFixture[],
  sceneGroups: SceneGroups,
  intensityCeiling: number
): FlattenedFixture[] {
  return getFixturesInGroups(fixtures, sceneGroups).filter(
    (fixture) => fixture.intensity <= intensityCeiling
  )
}

export function countDmxRandomizerSlots(
  fixtures: FlattenedFixture[],
  sceneGroups: SceneGroups,
  intensityCeiling: number
): number {
  return getDmxRandomizerFixtures(fixtures, sceneGroups, intensityCeiling).length
}

function flattenedFixtureIdentityKey(fixture: FlattenedFixture): string {
  const fixtureId =
    typeof fixture.fixtureId === 'string' ? fixture.fixtureId.trim() : ''
  if (fixtureId.length > 0) {
    return `id:${fixtureId}`
  }
  const firstCh = fixture.channels[0]?.[0]
  const typeId =
    typeof fixture.fixtureTypeId === 'string' ? fixture.fixtureTypeId : ''
  return `ch:${Number.isFinite(firstCh) ? firstCh : -1}:type:${typeId}`
}

/** Slot index in the split randomizer array for a DMX fixture, or -1 if filtered out. */
export function dmxRandomizerSlotIndex(
  randomizerFixtures: FlattenedFixture[],
  fixture: FlattenedFixture
): number {
  const key = flattenedFixtureIdentityKey(fixture)
  return randomizerFixtures.findIndex(
    (entry) => flattenedFixtureIdentityKey(entry) === key
  )
}

export function countSplitRandomizerSlots(
  fixtures: FlattenedFixture[],
  ledFixtures: LedFixture[],
  sceneGroups: SceneGroups,
  intensityCeiling: number
): number {
  return (
    countDmxRandomizerSlots(fixtures, sceneGroups, intensityCeiling) +
    countLedRandomizerSlots(ledFixtures, sceneGroups)
  )
}

/** Pixel offset within the LED portion of a split's randomizer array. */
export function getLedFixtureRandomizerBaseIndex(
  ledFixtures: LedFixture[],
  sceneGroups: SceneGroups,
  fixtureId: string
): number {
  let offset = 0
  for (const fixture of getLedFixturesInSceneGroups(ledFixtures, sceneGroups)) {
    if (fixture.id === fixtureId) {
      return offset
    }
    offset += getLedFixturePixelCount(fixture)
  }
  return offset
}

export function pickPrimarySplitLayerForLed<T extends { splitIndex: number }>(
  layers: T[],
  splitScenes: Array<{ groups: SceneGroups }>
): T | null {
  if (layers.length === 0) {
    return null
  }

  const withExplicitInclude = layers.filter((layer) => {
    const groups = splitScenes[layer.splitIndex]?.groups
    return groups !== undefined && sceneGroupsHasExplicitInclude(groups)
  })

  return withExplicitInclude[0] ?? layers[0]
}

export function buildLedRandomizerContext(
  splitState: { randomizer: RandomizerState; outputParams: Params } | undefined,
  splitScene: { groups: SceneGroups } | undefined,
  ledFixtures: LedFixture[],
  flattenedFixtures: FlattenedFixture[],
  fixtureId: string
): { state: RandomizerState; baseIndex: number; randomize: number } | null {
  if (splitState === undefined || splitScene === undefined) {
    return null
  }

  const randomize = getParam(splitState.outputParams, 'randomize')
  if (randomize <= 0) {
    return null
  }

  const intensityCeiling = splitState.outputParams.intensity ?? 1
  const baseIndex =
    countDmxRandomizerSlots(flattenedFixtures, splitScene.groups, intensityCeiling) +
    getLedFixtureRandomizerBaseIndex(ledFixtures, splitScene.groups, fixtureId)

  return {
    state: splitState.randomizer,
    baseIndex,
    randomize,
  }
}

export function applyLedRandomizerToColors(
  colors: BaseColors[],
  randomizer: RandomizerState | undefined,
  randomizerBaseIndex: number,
  randomizationAmount: number
): BaseColors[] {
  if (randomizationAmount <= 0 || colors.length === 0) {
    return colors
  }

  return colors.map((color, pixelIndex) => {
    const randomizerLevel = randomizer?.[randomizerBaseIndex + pixelIndex]?.level ?? 1
    return {
      red: applyRandomization(color.red, randomizerLevel, randomizationAmount),
      green: applyRandomization(color.green, randomizerLevel, randomizationAmount),
      blue: applyRandomization(color.blue, randomizerLevel, randomizationAmount),
    }
  })
}
