import { Window, Window2D_t, window2DToParentCoords } from '../shared/window'
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
import { getParam, Params } from './params'
import { clampNormalized, lerp, Normalized } from '../math/util'
import { rLerp } from '../math/range'
import { applyRandomization } from './randomizer'
import { TimeState } from './TimeState'
import {
  ColorKind,
  getColorChannelDistance,
  getColorChannelLevel,
  inferColorKind,
} from './dmxColors'

export function getWindowMultiplier2D(
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

export function forEachChannel(fixtures: FlattenedFixture[], cb: (fixtureIdx: number, fixture: FlattenedFixture, channelIdx: number, channel: FixtureChannel) => void) {
  fixtures.forEach((fixture, fixtureIdx) => {
    fixture.channels.forEach(([channelNumber, channel]) => {
      cb(fixtureIdx, fixture, channelNumber - 1, channel)
    })
  })
}

export function getDefaultDmxValue(
  ch: FixtureChannel,
): DmxValue {
  switch (ch.type) {
    case 'master':
      return ch.min
    case 'axis':
      return lerp(ch.min, ch.max, 0.5)
    case 'custom':
      return ch.default
    default: // 'color' | 'strobe' | 'colorMap'
      return DMX_DEFAULT_VALUE
  }
}

function getStrobeMaskParam(kind: ColorKind): 'strobeRgb' | 'strobeWhite' | 'strobeWarmWhite' | 'strobeAmber' | 'strobeUv' {
  if (kind === 'white') return 'strobeWhite'
  if (kind === 'warmWhite') return 'strobeWarmWhite'
  if (kind === 'amber') return 'strobeAmber'
  if (kind === 'uv') return 'strobeUv'
  return 'strobeRgb'
}

function isStrobeMaskEnabled(params: Params, kind: ColorKind): boolean {
  return getParam(params, getStrobeMaskParam(kind)) > 0.5
}

function anyStrobeMaskEnabled(params: Params): boolean {
  return (
    getParam(params, 'strobeRgb') > 0.5 ||
    getParam(params, 'strobeWhite') > 0.5 ||
    getParam(params, 'strobeWarmWhite') > 0.5 ||
    getParam(params, 'strobeAmber') > 0.5 ||
    getParam(params, 'strobeUv') > 0.5
  )
}

function isStrobePulseOpen(params: Params, timeState: TimeState): boolean {
  const strobeAmount = getParam(params, 'strobe')
  if (strobeAmount <= 0.001) return true

  // Map strobe amount to pulses per beat so strobe speed follows timeline tempo.
  const pulsesPerBeat = lerp(0.5, 24.0, strobeAmount)
  const phase = (timeState.beats * pulsesPerBeat) % 1.0
  return phase < 0.5
}

function dedicatedColorParam(params: Params, kind: ColorKind): number | null {
  if (kind === 'white') {
    return params.white ?? null
  }
  if (kind === 'warmWhite') {
    return params.warmWhite ?? null
  }
  if (kind === 'amber') {
    return params.amber ?? null
  }
  if (kind === 'uv') {
    return params.uv ?? null
  }
  return null
}

function shouldOutputColorChannel(
  params: Params,
  timeState: TimeState,
  kind: ColorKind
): boolean {
  const strobeAmount = getParam(params, 'strobe')
  if (strobeAmount <= 0.001) return true
  if (!isStrobeMaskEnabled(params, kind)) return true
  return isStrobePulseOpen(params, timeState)
}

export function getDmxValue(
  ch: FixtureChannel,
  params: Params,
  fixture: FlattenedFixture,
  master: number,
  randomizerLevel: number,
  timeState: TimeState
): DmxValue {
  const movingWindow = getMovingWindow(params)

  switch (ch.type) {
    case 'master': {
      const level =
        getBrightness(params, randomizerLevel, fixture.window, movingWindow) *
        master
      if (ch.isOnOff) {
        return level > 0.5 ? ch.max : ch.min
      } else {
        return rLerp(ch, level)
      }
    }
    case 'color': {
      const kind = inferColorKind(ch.color)
      if (!shouldOutputColorChannel(params, timeState, kind)) {
        return 0
      }

      const useFixtureMaster = fixture.hasMasterChannelInFixtureType === true
      const brightness =
        getBrightness(params, randomizerLevel, fixture.window, movingWindow) *
        (useFixtureMaster ? 1 : master)

      const dedicated = dedicatedColorParam(params, kind)
      if (dedicated !== null) {
        return clampNormalized(dedicated) * brightness * DMX_MAX_VALUE
      }

      return (
        getColorChannelLevel(
          getParam(params, 'hue'),
          getParam(params, 'saturation'),
          brightness,
          ch.color
        ) * DMX_MAX_VALUE
      )
    }
    case 'strobe': {
      const strobeAmount = getParam(params, 'strobe')
      if (strobeAmount <= 0.001 || !anyStrobeMaskEnabled(params)) {
        return ch.default_solid
      }
      return isStrobePulseOpen(params, timeState)
        ? ch.default_strobe
        : ch.default_solid
    }
    case 'axis':
      if (ch.dir === 'x') {
        return calculate_axis_channel(
          ch,
          getParam(params, 'xAxis'),
          fixture.window?.x?.pos,
          getParam(params, 'xMirror'),
          fixture
        )
      } else {
        return calculate_axis_channel(
          ch,
          getParam(params, 'yAxis'),
          fixture.window?.y?.pos,
          0.0, // No y-mirroring yet
          fixture
        )
      }
    case 'colorMap': {
      const hue = getParam(params, 'hue')
      const saturation = getParam(params, 'saturation')

      let closestColor = null as null | { max: DmxValue }
      let minDistance = Number.MAX_VALUE
      for (const color of ch.colors) {
        const distance = getColorChannelDistance(hue, saturation, color)
        if (distance < minDistance) {
          minDistance = distance
          closestColor = color
        }
      }

      return closestColor?.max ?? DMX_DEFAULT_VALUE
    }
    case 'custom': {
      const customParam = params[ch.name]
      if (customParam === undefined) {
        return ch.default
      } else {
        return rLerp(ch, customParam)
      }
    }
    default:
      return DMX_DEFAULT_VALUE
  }
}

export function getBrightness(
  params: Params,
  randomizerLevel: Normalized,
  fixtureWindow: Window2D_t,
  movingWindow: Window2D_t
): Normalized {
  const unrandomizedBrightness =
    getParam(params, 'brightness') *
    getWindowMultiplier2D(fixtureWindow, movingWindow)
  return applyRandomization(
    unrandomizedBrightness,
    randomizerLevel,
    getParam(params, 'randomize')
  )
}

export function getMovingWindow(params: Params): Window2D_t {
  return {
    x: {
      pos: getParam(params, 'x'),
      width: getParam(params, 'width')
    },
    y: {
      pos: getParam(params, 'y'),
      width: getParam(params, 'height')
    },
  }
}

export function getFixturesInGroups(
  fixtures: FlattenedFixture[],
  scene_groups: { [key: string]: boolean | undefined }
) {
  let entries = Object.entries(scene_groups)

  let groups = entries
    .filter(([_, include]) => include === true)
    .map(([group, _]) => group)
  let not_groups = entries
    .filter(([_, include]) => include === false)
    .map(([group, _]) => group)

  // Scenes with no groups specified affect
  if (entries.length === 0) return fixtures

  return fixtures.filter((fixture) => {
    if (groups.find((g) => fixture.groups.includes(g))) return true
    if (not_groups.find((g) => !fixture.groups.includes(g))) return true
    return false
  })
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
  const groups = [...fixtureType.groups]
  return groups.sort((a, b) => (a > b ? 1 : -1))
}

export function getSortedGroups(
  universe: Universe,
  fixtureTypeIds: string[],
  fixtureTypesById: { [id: string]: FixtureType }
) {
  const groupSet: Set<string> = new Set()
  for (const fixture of universe) {
    for (const group of fixture.groups) {
      groupSet.add(group)
    }
  }
  for (const id of fixtureTypeIds) {
    const fixtureType = fixtureTypesById[id]
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
  axis_param: Normalized,
  fixture_position: Normalized | undefined,
  mirror_param: Normalized,
  fixture: FlattenedFixture
) {
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
  const hasMasterChannelInFixtureType = fixture_type.channels.some(
    (channel) => channel.type === 'master'
  )

  let flattened: FlattenedFixture[] = fixture_type.subFixtures.map((sub) => {
    return {
      intensity: sub.intensity ?? fixture_type.intensity,
      window: sub.relative_window
        ? window2DToParentCoords(sub.relative_window, fixture.window)
        : fixture.window,
      channels: sub.channels.map((ch_index) => {
        subfixture_ch_indexes.add(ch_index)
        return [base_channel + ch_index, fixture_type.channels[ch_index]]
      }),
      hasMasterChannelInFixtureType,
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
    hasMasterChannelInFixtureType,
    groups,
  })

  // Only return fixtures that actually have channels.
  // This improves the behavior of the randomizer engine
  return flattened.filter((fixture) => fixture.channels.length > 0)
}

export function flatten_fixtures(
  universe: Universe,
  fixture_types_by_id: { [id: string]: FixtureType }
): FlattenedFixture[] {
  return universe
    .map((f) => flatten_fixture(f, fixture_types_by_id[f.type], f.ch))
    .flat(1)
}
