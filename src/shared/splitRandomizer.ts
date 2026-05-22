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

export function countDmxRandomizerSlots(
  fixtures: FlattenedFixture[],
  sceneGroups: SceneGroups,
  intensityCeiling: number
): number {
  return getFixturesInGroups(fixtures, sceneGroups).filter(
    (fixture) => fixture.intensity <= intensityCeiling
  ).length
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
