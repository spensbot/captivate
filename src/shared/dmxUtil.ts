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
  FlattenedFixture,
} from './dmxFixtures'
import { Params } from './params'
import { lerp, Normalized } from '../math/util'
import { rLerp } from '../math/range'

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
  fixture: FlattenedFixture,
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
          fixture
        )
      } else {
        return calculate_axis_channel(
          ch,
          params.yAxis,
          fixture.window?.y?.pos,
          undefined, // No y-mirroring yet
          fixture
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

export function getFixturesInGroups(
  fixtures: FlattenedFixture[],
  groups: string[]
) {
  return groups.length === 0
    ? fixtures
    : fixtures.filter(
        (fixture) =>
          fixture.groups.find((g) => groups.includes(g)) !== undefined
      )
}

export function getSortedGroupsForFixture(
  fixture: Fixture,
  fixtureType: FixtureType
) {
  const groupSet: Set<string> = new Set()
  for (const group of fixture.groups) {
    groupSet.add(group)
  }
  for (const group of fixtureType.groups) {
    groupSet.add(group)
  }
  return Array.from(groupSet.keys()).sort((a, b) => (a > b ? 1 : -1))
}

export function getSortedGroupsForFixtureType(fixtureType: FixtureType) {
  return fixtureType.groups.sort((a, b) => (a > b ? 1 : -1))
}

export function getSortedGroups(
  universe: Universe,
  fixtureTypesById: { [id: string]: FixtureType }
) {
  const groupSet: Set<string> = new Set()
  for (const fixture of universe) {
    for (const group of fixture.groups) {
      groupSet.add(group)
    }
    const fixtureType = fixtureTypesById[fixture.type]
    for (const group of fixtureType.groups) {
      groupSet.add(group)
    }
    for (const sub of fixtureType.subFixtures) {
      for (const group of sub.groups) {
        groupSet.add(group)
      }
    }
  }
  return Array.from(groupSet.keys()).sort((a, b) => (a > b ? 1 : -1))
}

function calculate_axis_channel(
  ch: ChannelAxis,
  axis_param: Normalized | undefined,
  fixture_position: Normalized | undefined,
  mirror_param: Normalized | undefined,
  fixture: FlattenedFixture
) {
  if (axis_param === undefined) return 0

  let mirrored_param =
    fixture_position && fixture_position > 0.5
      ? applyMirror(axis_param, mirror_param)
      : axis_param

  if (ch.isFine) {
    const step_count = axis_range(fixture, ch.dir)
    const step_delta = 1 / step_count
    let remainder = mirrored_param % step_delta
    let remainder_ratio = remainder / step_delta
    return remainder_ratio * DMX_MAX_VALUE
  } else {
    return Math.floor(rLerp(ch, mirrored_param))
  }
}

function axis_range(fixture: FlattenedFixture, dir: AxisDir) {
  for (const [_channel_num, ch] of fixture.channels) {
    if (ch.type === 'axis' && ch.dir === dir && !ch.isFine)
      return ch.max - ch.min
  }
  return DMX_MAX_VALUE - DMX_MIN_VALUE
}

export function flatten_fixture(
  fixture: Fixture,
  fixture_type: FixtureType,
  base_channel: number // DMX Channel assigned to the fixture
): FlattenedFixture[] {
  let subfixture_ch_indexes: Set<number> = new Set()

  let groups = fixture.groups.concat(fixture_type.groups)

  let flattened: FlattenedFixture[] = fixture_type.subFixtures.map((sub) => {
    return {
      intensity: sub.intensity ?? fixture_type.intensity,
      window: sub.relative_window ?? fixture.window,
      channels: sub.channels.map((ch_index) => {
        subfixture_ch_indexes.add(ch_index)
        return [base_channel + ch_index, fixture_type.channels[ch_index]]
      }),
      groups: groups.concat(sub.groups),
    }
  })

  flattened.push({
    intensity: fixture_type.intensity,
    window: fixture.window,
    channels: fixture_type.channels
      .map((ch, ch_index) => {
        return [ch_index, ch] as [number, FixtureChannel]
      })
      .filter(([ch_index]) => !subfixture_ch_indexes.has(ch_index))
      .map(([ch_index, ch]) => [base_channel + ch_index, ch]),
    groups,
  })

  return flattened
}

export function flatten_fixtures(
  universe: Universe,
  fixture_types_by_id: { [id: string]: FixtureType }
): FlattenedFixture[] {
  return universe
    .map((f) => flatten_fixture(f, fixture_types_by_id[f.type], f.ch))
    .flat(1)
}
