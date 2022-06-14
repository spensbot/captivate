import { getColors } from './dmxColors'
import { Window, Window2D_t } from '../shared/window'
import {
  DmxValue,
  DMX_MAX_VALUE,
  FixtureChannel,
  Fixture,
  Universe,
} from './dmxFixtures'
import { Params } from './params'
import { lerp } from '../math/util'
import { rLerp } from '../math/range'
import { LightScene_t } from 'shared/Scenes'

function getWindowMultiplier2D(
  fixtureWindow: Window2D_t,
  movingWindow: Window2D_t
) {
  return (
    getWindowMultiplier(fixtureWindow.x, movingWindow.x) *
    getWindowMultiplier(fixtureWindow.y, movingWindow.y)
  )
}

function getWindowMultiplier(fixtureWindow?: Window, movingWindow?: Window) {
  if (fixtureWindow && movingWindow) {
    const distanceBetween = Math.abs(fixtureWindow.pos - movingWindow.pos) / 2
    const reach = fixtureWindow.width / 2 + movingWindow.width / 2
    return distanceBetween > reach ? 0.0 : 1.0 - distanceBetween / reach
  }
  return 1.0 // Don't affect light values if the moving window or fixture position haven't been assigned.
}

// Value and MirrorAmount should be normalized (0 - 1)
export function applyMirror(value: number, mirrorAmount: number) {
  const doubleNorm = value * 2 - 1
  const mirroredDoubleNorm = lerp(doubleNorm, -doubleNorm, mirrorAmount)
  return (mirroredDoubleNorm + 1) / 2
}

export function getDmxValue(
  ch: FixtureChannel,
  params: Params,
  fixture: Fixture,
  master: number,
  randomizerLevel: number
): DmxValue {
  const movingWindow = getMovingWindow(params)
  const colors = getColors(params)

  switch (ch.type) {
    case 'master':
      const unrandomizedLevel =
        params.brightness *
        getWindowMultiplier2D(fixture.window, movingWindow) *
        master
      const level = applyRandomization(
        unrandomizedLevel,
        randomizerLevel,
        params.randomize
      )
      if (ch.isOnOff) {
        return level > 0.5 ? ch.max : ch.min
      } else {
        return rLerp(ch, level)
      }
    case 'other':
      return ch.default
    case 'color':
      return colors[ch.color] * DMX_MAX_VALUE
    case 'strobe':
      return params.strobe > 0.5 ? ch.default_strobe : ch.default_solid
    case 'axis':
      if (ch.dir === 'x') {
        const fixtureXPos = fixture.window?.x?.pos ?? 0
        const xAxis =
          fixtureXPos < 0.5
            ? params.xAxis
            : applyMirror(params.xAxis, params.xMirror)
        return rLerp(ch, xAxis)
      } else if (ch.dir === 'y') {
        return rLerp(ch, params.yAxis)
      } else {
        console.error('Unhandled axis dir')
        return 0
      }
    case 'colorMap':
      const _colors = ch.colors
      const firstColor = _colors[0]
      const hue = params.hue
      if (firstColor && params.saturation > 0.5) {
        const closestColor = _colors.reduce((current, color) => {
          const currentDif = Math.min(
            Math.abs(current.hue - hue),
            Math.abs(current.hue - (hue - 1))
          )
          const dif = Math.min(
            Math.abs(color.hue - hue),
            Math.abs(color.hue - (hue - 1))
          )
          return dif < currentDif ? color : current
        }, firstColor)
        return closestColor.max
      } else {
        return 0
      }
    case 'mode':
      return rLerp(ch, params.mode)
    default:
      return 0
  }
}

export function getMovingWindow(params: Params): Window2D_t {
  return {
    x: { pos: params.x, width: params.width },
    y: { pos: params.y, width: params.height },
  }
}

export function applyRandomization(
  value: number,
  randomizerLevel: number,
  randomizationAmount: number
) {
  return lerp(value, value * randomizerLevel, randomizationAmount)
}
export interface UniverseFixture {
  fixture: Fixture
  universeIndex: number
}

export function getFixturesWithIndexes(universe: Universe): UniverseFixture[] {
  return universe.map((fixture, universeIndex) => ({ fixture, universeIndex }))
}

export function getFixturesNotInGroups(
  universe: Universe,
  groups: Set<string>
) {
  return getFixturesWithIndexes(universe).filter(
    ({ fixture }) => !groups.has(fixture.group)
  )
}

export function getFixturesInGroups(universe: Universe, groups: string[]) {
  return getFixturesWithIndexes(universe).filter(({ fixture }) =>
    groups.includes(fixture.group)
  )
}

export function getMainGroups(
  activeScene: LightScene_t,
  all_groups: string[]
): string[] {
  let splitSceneGroups = getAllSplitSceneGroups(activeScene)
  return all_groups.filter((group) => !splitSceneGroups.has(group))
}

function getAllSplitSceneGroups(activeScene: LightScene_t) {
  return activeScene.splitScenes.reduce<Set<string>>((accum, splitScene) => {
    for (const group of splitScene.groups) {
      accum.add(group)
    }
    return accum
  }, new Set())
}

export function getSortedGroups(universe: Universe) {
  const groupSet: Set<string> = new Set()
  for (const fixture of universe) {
    groupSet.add(fixture.group)
  }
  return Array.from(groupSet.keys()).sort((a, b) => (a > b ? 1 : -1))
}
