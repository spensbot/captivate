import { Window, Window2D_t, window2DToParentCoords } from '../shared/window'
import {
  DmxValue,
  DMX_MAX_VALUE,
  FixtureChannel,
  Fixture,
  Universe,
  DMX_DEFAULT_VALUE,
  ChannelAxis,
  ChannelColorMap,
  FixtureType,
  AxisDir,
  DMX_MIN_VALUE,
  FlattenedFixture,
  initMoverCalibration,
  isMoverFixtureType,
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
    getWindowMultiplier(fixtureWindow.y, movingWindow.y) *
    getWindowMultiplier(fixtureWindow.z, movingWindow.z)
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

function detectImportedHueScale(rawHueValues: number[]): number {
  if (rawHueValues.length === 0) {
    return 1
  }

  const maxHue = Math.max(...rawHueValues)

  if (maxHue <= 1.001) {
    return 1
  }

  if (maxHue <= 100.001) {
    return 100
  }

  if (maxHue <= 255.001) {
    return 255
  }

  if (maxHue <= 360.001) {
    return 360
  }

  return 1
}

function normalizeImportedHue(value: number, fallback: number, scale: number): number {
  if (!Number.isFinite(value)) return fallback

  if (scale <= 1.001) {
    return clampNormalized(value)
  }

  return clampNormalized(value / scale)
}

function normalizeImportedSaturation(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback

  if (value >= 0 && value <= 1) {
    return clampNormalized(value)
  }

  // Support imports that store saturation as percentage.
  if (value >= 0 && value <= 100) {
    return clampNormalized(value / 100)
  }

  // Support 8-bit style saturation values.
  if (value >= 0 && value <= 255) {
    return clampNormalized(value / 255)
  }

  return clampNormalized(value)
}


function clampColorMapDmxValue(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(DMX_MAX_VALUE, Math.max(DMX_MIN_VALUE, Math.round(value)))
}

type IndexedColorMapEntry = {
  hue: number
  saturation: number
  kind?: ColorKind
  outputDmx: number
}

const colorMapLookupCache = new WeakMap<ChannelColorMap, IndexedColorMapEntry[]>()

function buildColorMapLookup(channel: ChannelColorMap): IndexedColorMapEntry[] {
  const validColors = channel.colors.filter((color) => Number.isFinite(color.max))
  if (validColors.length === 0) {
    return []
  }

  const rawHueValues = validColors
    .map((color) => Number(color.hue))
    .filter((value) => Number.isFinite(value))
  const importedHueScale = detectImportedHueScale(rawHueValues)

  const normalizedColors = validColors.map((color, i) => {
    const fallbackHue = validColors.length <= 1 ? 0 : i / (validColors.length - 1)

    return {
      ...color,
      hue: normalizeImportedHue(color.hue, fallbackHue, importedHueScale),
      saturation: normalizeImportedSaturation(color.saturation, 1),
    }
  })

  return [...normalizedColors]
    .map((color) => ({
      ...color,
      max: clampColorMapDmxValue(color.max, DMX_DEFAULT_VALUE),
    }))
    .sort((left, right) => left.max - right.max)
    .map((color, index, sortedColors) => {
      const previousMax = index > 0 ? sortedColors[index - 1].max : DMX_MIN_VALUE - 1

      const rangeMin = Math.min(
        DMX_MAX_VALUE,
        Math.max(DMX_MIN_VALUE, previousMax + 1)
      )
      const rangeMax = Math.min(DMX_MAX_VALUE, Math.max(rangeMin, color.max))

      return {
        hue: color.hue,
        saturation: color.saturation,
        kind: color.kind,
        // Keep output in the middle of each slot so wheel output stays stable.
        outputDmx:
          rangeMin >= rangeMax
            ? rangeMax
            : Math.round((rangeMin + rangeMax) / 2),
      }
    })
}

function getColorMapLookup(channel: ChannelColorMap): IndexedColorMapEntry[] {
  const cachedLookup = colorMapLookupCache.get(channel)
  if (cachedLookup !== undefined) {
    return cachedLookup
  }

  const lookup = buildColorMapLookup(channel)
  colorMapLookupCache.set(channel, lookup)
  return lookup
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
    case 'goboMap': {
      const defaultIndex = Math.max(
        0,
        Math.min(Math.round(ch.defaultIndex), ch.gobos.length - 1)
      )
      return ch.gobos[defaultIndex]?.max ?? DMX_DEFAULT_VALUE
    }
    default: // 'color' | 'strobe' | 'colorMap' | 'goboMap'
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

const SYNTHETIC_STROBE_OFF_THRESHOLD = 0.02
const SYNTHETIC_STROBE_MIN_HZ = 0.5
const DEFAULT_SYNTHETIC_STROBE_FRAME_RATE_HZ = 30

export type MoverAxisOverrides = {
  panDmx?: number
  tiltDmx?: number
}

function mapAxisWithCalibration(
  axisValue: Normalized,
  axisCalibration?: {
    min: number
    max: number
    invert: boolean
  }
): Normalized {
  const normalizedValue = clampNormalized(axisValue)

  if (axisCalibration === undefined) {
    return normalizedValue
  }

  const min = Math.min(
    DMX_MAX_VALUE,
    Math.max(DMX_MIN_VALUE, Math.round(axisCalibration.min))
  )
  const max = Math.min(
    DMX_MAX_VALUE,
    Math.max(DMX_MIN_VALUE, Math.round(axisCalibration.max))
  )
  const orientedValue = axisCalibration.invert
    ? 1 - normalizedValue
    : normalizedValue

  const calibratedDmx = lerp(min, max, orientedValue)
  return clampNormalized(calibratedDmx / DMX_MAX_VALUE)
}

function axisOverrideDmxToNormalized(dmxValue: number | undefined): Normalized | null {
  if (dmxValue === undefined || !Number.isFinite(dmxValue)) {
    return null
  }

  const clamped = Math.min(DMX_MAX_VALUE, Math.max(DMX_MIN_VALUE, dmxValue))
  return clampNormalized(clamped / DMX_MAX_VALUE)
}

function getSyntheticStrobeHalfCycleFrames(
  strobeAmount: number,
  frameRateHz: number
): number | null {
  if (strobeAmount <= SYNTHETIC_STROBE_OFF_THRESHOLD) {
    return null
  }

  const safeFrameRateHz = Math.max(1, frameRateHz)
  const normalizedRate = clampNormalized(
    (strobeAmount - SYNTHETIC_STROBE_OFF_THRESHOLD) /
      (1 - SYNTHETIC_STROBE_OFF_THRESHOLD)
  )

  // Do not exceed what the output frame rate can represent cleanly.
  const maxCleanRateHz = Math.max(
    SYNTHETIC_STROBE_MIN_HZ,
    safeFrameRateHz / 2
  )
  const desiredRateHz = lerp(
    SYNTHETIC_STROBE_MIN_HZ,
    maxCleanRateHz,
    normalizedRate
  )

  // Quantize to whole output frames to avoid aliasing/stutter artifacts.
  return Math.max(1, Math.round(safeFrameRateHz / (desiredRateHz * 2)))
}

function isSyntheticStrobePulseOpen(
  params: Params,
  timeState: TimeState,
  frameRateHz: number
): boolean {
  const halfCycleFrames = getSyntheticStrobeHalfCycleFrames(
    getParam(params, 'strobe'),
    frameRateHz
  )
  if (halfCycleFrames === null) return true

  const safeBpm = Math.max(1, timeState.bpm)
  const safeFrameRateHz = Math.max(1, frameRateHz)
  const elapsedSeconds = (timeState.beats * 60) / safeBpm
  const frameIndex = Math.floor(elapsedSeconds * safeFrameRateHz)
  const phaseFrame = frameIndex % (halfCycleFrames * 2)

  // Fixed 50% duty cycle: equal frame counts for on/off.
  return phaseFrame < halfCycleFrames
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
  kind: ColorKind,
  syntheticStrobeFrameRateHz: number
): boolean {
  if (!isStrobeMaskEnabled(params, kind)) return true
  return isSyntheticStrobePulseOpen(params, timeState, syntheticStrobeFrameRateHz)
}

export function getDmxValue(
  ch: FixtureChannel,
  params: Params,
  fixture: FlattenedFixture,
  master: number,
  randomizerLevel: number,
  timeState: TimeState,
  syntheticStrobeFrameRateHz: number = DEFAULT_SYNTHETIC_STROBE_FRAME_RATE_HZ,
  axisOverrides?: MoverAxisOverrides
): DmxValue {
  const movingWindow = getMovingWindow(params)

  switch (ch.type) {
    case 'master': {
      const level =
        getWindowRandomizerLevel(
          params,
          randomizerLevel,
          fixture.window,
          movingWindow
        ) * master * getParam(params, 'brightness')
      if (ch.isOnOff) {
        return level > 0.5 ? ch.max : ch.min
      } else {
        return rLerp(ch, level)
      }
    }
    case 'color': {
      const kind = inferColorKind(ch.color)
      if (
        !shouldOutputColorChannel(
          params,
          timeState,
          kind,
          syntheticStrobeFrameRateHz
        )
      ) {
        return 0
      }

      const useFixtureMaster = fixture.hasMasterChannelInFixtureType === true
      const outputScale = useFixtureMaster
        ? 1
        : getWindowRandomizerLevel(
            params,
            randomizerLevel,
            fixture.window,
            movingWindow
          ) * master

      const dedicated = dedicatedColorParam(params, kind)
      if (dedicated !== null) {
        return clampNormalized(dedicated) * outputScale * DMX_MAX_VALUE
      }

      return (
        getColorChannelLevel(
          getParam(params, 'hue'),
          getParam(params, 'saturation'),
          getParam(params, 'brightness'),
          ch.color
        ) * outputScale * DMX_MAX_VALUE
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
        const panOverride = axisOverrideDmxToNormalized(axisOverrides?.panDmx)
        const panValue =
          panOverride ??
          mapAxisWithCalibration(
            getParam(params, 'xAxis'),
            fixture.moverCalibration?.pan
          )

        const panMirrorAmount = panOverride === null ? getParam(params, 'xMirror') : 0

        return calculate_axis_channel(
          ch,
          panValue,
          fixture.window?.x?.pos,
          panMirrorAmount,
          fixture
        )
      } else {
        const tiltOverride = axisOverrideDmxToNormalized(axisOverrides?.tiltDmx)
        const tiltValue =
          tiltOverride ??
          mapAxisWithCalibration(
            getParam(params, 'yAxis'),
            fixture.moverCalibration?.tilt
          )

        return calculate_axis_channel(
          ch,
          tiltValue,
          fixture.window?.y?.pos,
          0.0, // No y-mirroring yet
          fixture
        )
      }
    case 'colorMap': {
      const hue = clampNormalized(getParam(params, 'hue'))
      const saturation = clampNormalized(getParam(params, 'saturation'))

      const indexedColors = getColorMapLookup(ch)
      if (indexedColors.length === 0) {
        return DMX_DEFAULT_VALUE
      }

      const whiteThreshold = 0.02
      const whiteEntries = indexedColors.filter(
        (color) => inferColorKind(color) === 'white' || color.saturation <= whiteThreshold
      )

      let candidateColors = indexedColors
      if (saturation <= whiteThreshold && whiteEntries.length > 0) {
        candidateColors = whiteEntries
      } else if (saturation > whiteThreshold) {
        const chromaEntries = indexedColors.filter(
          (color) => !(inferColorKind(color) === 'white' || color.saturation <= whiteThreshold)
        )
        if (chromaEntries.length > 0) {
          candidateColors = chromaEntries
        }
      }

      let closestColor = candidateColors[0]
      let minScore = Number.POSITIVE_INFINITY

      for (let i = 0; i < candidateColors.length; i++) {
        const color = candidateColors[i]

        const baseScore = getColorChannelDistance(hue, saturation, color)
        if (!Number.isFinite(baseScore)) {
          continue
        }

        const stableScore = baseScore + i * 0.0001
        if (stableScore < minScore) {
          minScore = stableScore
          closestColor = color
        }
      }

      // Color-map channels should select a stable indexed slot.
      // Use a midpoint inside each DMX band to avoid landing on boundary values.
      return closestColor.outputDmx
    }
    case 'goboMap': {
      const goboCount = ch.gobos.length
      if (goboCount <= 0) return DMX_DEFAULT_VALUE

      const rawGoboSelection = params.gobo
      const selectedIndex = Number.isFinite(rawGoboSelection)
        ? Math.max(
            0,
            Math.min(
              goboCount - 1,
              Math.round(clampNormalized(rawGoboSelection as number) * (goboCount - 1))
            )
          )
        : Math.max(0, Math.min(Math.round(ch.defaultIndex), goboCount - 1))

      return ch.gobos[selectedIndex]?.max ?? DMX_DEFAULT_VALUE
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

function getWindowRandomizerLevel(
  params: Params,
  randomizerLevel: Normalized,
  fixtureWindow: Window2D_t,
  movingWindow: Window2D_t
): Normalized {
  const windowLevel = getWindowMultiplier2D(fixtureWindow, movingWindow)
  return applyRandomization(
    windowLevel,
    randomizerLevel,
    getParam(params, 'randomize')
  )
}

export function getBrightness(
  params: Params,
  randomizerLevel: Normalized,
  fixtureWindow: Window2D_t,
  movingWindow: Window2D_t
): Normalized {
  return (
    getParam(params, 'brightness') *
    getWindowRandomizerLevel(
      params,
      randomizerLevel,
      fixtureWindow,
      movingWindow
    )
  )
}

export function getMovingWindow(params: Params): Window2D_t {
  const movingWindow: Window2D_t = {
    x: {
      pos: getParam(params, 'x'),
      width: getParam(params, 'width')
    },
    y: {
      pos: getParam(params, 'y'),
      width: getParam(params, 'height')
    },
  }

  if (params.z !== undefined || params.depth !== undefined) {
    const zPos = getParam(params, 'z')
    const depth = getParam(params, 'depth')
    const zCenterReference = Number(params.zCenterReference ?? 0)
    const isDanceCenter = Number.isFinite(zCenterReference) && zCenterReference > 0.5

    // Dance-center depth behaves like XY width/height (symmetric around Z).
    // Stage-center depth is one-sided and expands from stage edge toward audience.
    movingWindow.z = {
      pos: isDanceCenter ? zPos : 1 - depth / 2,
      width: depth,
    }
  }

  return movingWindow
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

function clampAxisDmxValue(value: number, fallback: number = DMX_MIN_VALUE) {
  if (!Number.isFinite(value)) {
    return fallback
  }

  return Math.min(DMX_MAX_VALUE, Math.max(DMX_MIN_VALUE, Math.round(value)))
}

function getCoarseAxisChannel(
  fixture: FlattenedFixture,
  dir: AxisDir
): ChannelAxis | undefined {
  for (const [_channel_num, channel] of fixture.channels) {
    if (channel.type === 'axis' && channel.dir === dir && !channel.isFine) {
      return channel
    }
  }

  return undefined
}

function getAxisCoarseFineValues(
  normalizedAxis: Normalized,
  coarseChannel: ChannelAxis
): { coarse: number; fine: number } {
  const min = clampAxisDmxValue(coarseChannel.min)
  const max = clampAxisDmxValue(coarseChannel.max)
  const span = Math.abs(max - min)

  // Map normalized axis into a full 16-bit space for stable coarse/fine pairing.
  const totalUnits = span * 256 + 255
  const fullResolutionValue = Math.min(
    totalUnits,
    Math.max(0, Math.round(clampNormalized(normalizedAxis) * totalUnits))
  )

  const coarseStep = Math.floor(fullResolutionValue / 256)
  const fineValue = fullResolutionValue % 256
  const coarseValue = max >= min ? min + coarseStep : min - coarseStep

  return {
    coarse: clampAxisDmxValue(coarseValue, min),
    fine: clampAxisDmxValue(fineValue, DMX_MIN_VALUE),
  }
}

function calculate_axis_channel(
  ch: ChannelAxis,
  axis_param: Normalized,
  fixture_position: Normalized | undefined,
  mirror_param: Normalized,
  fixture: FlattenedFixture
) {
  const mirroredParam =
    fixture_position !== undefined && fixture_position > 0.5
      ? applyMirror(axis_param, mirror_param)
      : axis_param

  const coarseChannel = ch.isFine ? getCoarseAxisChannel(fixture, ch.dir) : ch
  if (coarseChannel === undefined) {
    return Math.floor(rLerp(ch, clampNormalized(mirroredParam)))
  }

  const { coarse, fine } = getAxisCoarseFineValues(mirroredParam, coarseChannel)

  if (ch.isFine) {
    return Math.floor(rLerp(ch, fine / DMX_MAX_VALUE))
  }

  return coarse
}

function defaultMoverGroupName(fixture: Fixture, fixtureType: FixtureType): string {
  const fixtureGroup = fixture.groups.find((group) => group.trim().length > 0)
  if (fixtureGroup !== undefined) {
    return fixtureGroup
  }

  const fixtureTypeGroup = fixtureType.groups.find(
    (group) => group.trim().length > 0
  )
  if (fixtureTypeGroup !== undefined) {
    return fixtureTypeGroup
  }

  return fixtureType.name.trim().length > 0 ? fixtureType.name : 'Mover Group'
}

export function flatten_fixture(
  fixture: Fixture,
  fixture_type: FixtureType,
  base_channel: number, // DMX Channel assigned to the fixture
  moverGroupByFixtureId?: { [fixtureId: string]: string }
): FlattenedFixture[] {
  let subfixture_ch_indexes: Set<number> = new Set()

  const groups = fixture.groups.concat(fixture_type.groups)
  const hasMasterChannelInFixtureType = fixture_type.channels.some(
    (channel) => channel.type === 'master'
  )

  const fixtureId =
    typeof fixture.id === 'string' && fixture.id.trim().length > 0
      ? fixture.id
      : undefined

  const moverGroup =
    moverGroupByFixtureId?.[fixtureId ?? ''] ??
    defaultMoverGroupName(fixture, fixture_type)

  const moverCalibration = isMoverFixtureType(fixture_type)
    ? fixture_type.moverCalibration ?? initMoverCalibration()
    : undefined

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
      fixtureId,
      fixtureTypeId: fixture_type.id,
      moverGroup,
      moverCalibration,
      moverBounds: fixture.moverBounds,
      moverMountOrientation: fixture.moverMountOrientation,
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
    fixtureId,
    fixtureTypeId: fixture_type.id,
    moverGroup,
    moverCalibration,
    moverBounds: fixture.moverBounds,
    moverMountOrientation: fixture.moverMountOrientation,
  })

  // Only return fixtures that actually have channels.
  // This improves the behavior of the randomizer engine.
  return flattened.filter((fixtureItem) => fixtureItem.channels.length > 0)
}

export function flatten_fixtures(
  universe: Universe,
  fixture_types_by_id: { [id: string]: FixtureType },
  moverGroupByFixtureId?: { [fixtureId: string]: string }
): FlattenedFixture[] {
  return universe
    .map((fixture) =>
      flatten_fixture(
        fixture,
        fixture_types_by_id[fixture.type],
        fixture.ch,
        moverGroupByFixtureId
      )
    )
    .flat(1)
}

