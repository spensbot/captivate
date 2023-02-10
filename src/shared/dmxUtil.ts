import { getColors } from './dmxColors'
import { Window, Window2D_t } from '../shared/window'
import {
  DmxValue,
  DMX_MAX_VALUE,
  FixtureChannel,
  Fixture,
  Universe,
  DMX_DEFAULT_VALUE,
  ChannelAxis,
  FixtureType,
  AxisDir,
  DMX_MIN_VALUE,
} from './dmxFixtures'
import { Params } from './params'
import { lerp, Normalized } from '../math/util'
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
export function applyMirror(
  value: Normalized,
  mirrorAmount: Normalized | undefined
) {
  if (mirrorAmount === undefined) {
    mirrorAmount = 0
  }

  const doubleNorm = value * 2 - 1
  const mirroredDoubleNorm = lerp(doubleNorm, -doubleNorm, mirrorAmount)
  return (mirroredDoubleNorm + 1) / 2
}

export function getDmxValue(
  ch: FixtureChannel,
  params: Params,
  fixture: Fixture,
  fixture_type: FixtureType,
  master: number,
  randomizerLevel: number
): DmxValue {
  const movingWindow = getMovingWindow(params)
  const colors = getColors(params)

  switch (ch.type) {
    case 'master':
      const brightnessParam = params.brightness ?? 0
      const randomizeParam = params.randomize ?? 0

      const unrandomizedLevel =
        brightnessParam *
        getWindowMultiplier2D(fixture.window, movingWindow) *
        master
      const level = applyRandomization(
        unrandomizedLevel,
        randomizerLevel,
        randomizeParam
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
      return params.strobe !== undefined && params.strobe > 0.5
        ? ch.default_strobe
        : ch.default_solid
    case 'axis':
      if (ch.dir === 'x') {
        return calculate_axis_channel(
          ch,
          params.xAxis,
          fixture.window?.x?.pos,
          params.xMirror,
          fixture_type
        )
      } else {
        return calculate_axis_channel(
          ch,
          params.yAxis,
          fixture.window?.y?.pos,
          undefined, // No y-mirroring yet
          fixture_type
        )
      }
    case 'colorMap':
      const _colors = ch.colors
      const firstColor = _colors[0]
      const hue = params.hue
      const saturation = params.saturation
      if (
        hue !== undefined &&
        saturation !== undefined &&
        firstColor &&
        saturation > 0.5
      ) {
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
        return DMX_DEFAULT_VALUE
      }
    case 'custom':
      const customParam = params[ch.name]
      if (customParam === undefined) {
        return ch.default
      } else {
        return rLerp(ch, customParam)
      }
    default:
      return DMX_DEFAULT_VALUE
  }
}

export function getMovingWindow(params: Params): Window2D_t {
  const x =
    params.x !== undefined && params.width !== undefined
      ? { pos: params.x, width: params.width }
      : undefined

  const y =
    params.y !== undefined && params.height !== undefined
      ? { pos: params.y, width: params.height }
      : undefined

  return {
    x: x,
    y: y,
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

function calculate_axis_channel(
  ch: ChannelAxis,
  axis_param: Normalized | undefined,
  fixture_position: Normalized | undefined,
  mirror_param: Normalized | undefined,
  fixture_type: FixtureType
) {
  if (axis_param === undefined) return 0

  let mirrored_param =
    fixture_position && fixture_position > 0.5
      ? applyMirror(axis_param, mirror_param)
      : axis_param

  if (ch.isFine) {
    const step_count = axis_range(fixture_type, ch.dir)
    const step_delta = 1 / step_count
    let remainder = mirrored_param % step_delta
    let remainder_ratio = remainder / step_delta
    return remainder_ratio * DMX_MAX_VALUE
  } else {
    return Math.floor(rLerp(ch, mirrored_param))
  }
}

function axis_range(fixture_type: FixtureType, dir: AxisDir) {
  for (const ch of fixture_type.channels) {
    if (ch.type === 'axis' && ch.dir === dir && !ch.isFine)
      return ch.max - ch.min
  }
  return DMX_MAX_VALUE - DMX_MIN_VALUE
}
