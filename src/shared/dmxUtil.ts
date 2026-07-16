import { Window, Window2D_t, window2DToParentCoords } from '../shared/window'
import {
  computeEmitterCentroid,
  DmxValue,
  DMX_MAX_VALUE,
  FixtureChannel,
  LeafFixtureChannel,
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
  mergeSubRelativeWindowWithEmitterCentroid,
  emittersForSubfixtureIndex,
  resolvedEmittersForFixtureType,
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
import { evaluateSceneGroups } from './sceneGroups'
import {
  getFixtureGroupPickerOptions,
  normalizeFixtureGroupList,
} from './fixtureGroups'

type ChannelFamilyGroup =
  | 'rgb'
  | 'coolWhite'
  | 'warmWhite'
  | 'amber'
  | 'uv'
  | 'other'

const CHANNEL_FAMILY_GROUP_NAME: Record<Exclude<ChannelFamilyGroup, 'other'>, string> = {
  rgb: 'Emitters RGB',
  coolWhite: 'Emitters Cool White',
  warmWhite: 'Emitters Warm White',
  amber: 'Emitters Amber',
  uv: 'Emitters UV',
}

function channelFamilyGroupName(
  family: ChannelFamilyGroup
): string | undefined {
  if (family === 'other') return undefined
  return CHANNEL_FAMILY_GROUP_NAME[family]
}

function inferChannelFamilies(channel: FixtureChannel): Set<ChannelFamilyGroup> {
  if (channel.type === 'split') {
    const nestedFamilies = new Set<ChannelFamilyGroup>()
    for (const range of channel.ranges) {
      const rangeFamilies = inferChannelFamilies(range.channel)
      rangeFamilies.forEach((family) => nestedFamilies.add(family))
    }
    if (nestedFamilies.size <= 0) {
      nestedFamilies.add('other')
    }
    return nestedFamilies
  }

  if (channel.type === 'color') {
    const colorKind = inferColorKind(channel.color)
    if (colorKind === 'color') return new Set(['rgb'])
    if (colorKind === 'white') return new Set(['coolWhite'])
    if (colorKind === 'warmWhite') return new Set(['warmWhite'])
    if (colorKind === 'amber') return new Set(['amber'])
    if (colorKind === 'uv') return new Set(['uv'])
    return new Set(['other'])
  }

  if (channel.type === 'colorMap') {
    return new Set(['rgb'])
  }

  if (channel.type === 'custom') {
    const name = channel.name.trim().toLowerCase()
    if (name.includes('warm') && name.includes('white')) return new Set(['warmWhite'])
    if (name.includes('cool') && name.includes('white')) return new Set(['coolWhite'])
    if (name.includes('amber')) return new Set(['amber'])
    if (name.includes('uv') || name.includes('ultraviolet')) return new Set(['uv'])
    if (
      name.includes('rgb') ||
      name.includes('red') ||
      name.includes('green') ||
      name.includes('blue') ||
      name.includes('color') ||
      name.includes('colour')
    ) {
      return new Set(['rgb'])
    }
    if (name.includes('white')) return new Set(['coolWhite'])
  }

  return new Set(['other'])
}

function primaryChannelFamily(channel: FixtureChannel): ChannelFamilyGroup {
  const families = Array.from(inferChannelFamilies(channel))
  const nonOtherFamilies = families.filter((family) => family !== 'other')
  if (nonOtherFamilies.length === 1) {
    return nonOtherFamilies[0]
  }
  if (nonOtherFamilies.length > 1) {
    return 'other'
  }
  return families[0] ?? 'other'
}

function uniqueGroups(groups: string[]): string[] {
  const unique = new Set<string>()
  for (const group of groups) {
    const trimmed = group.trim()
    if (trimmed.length <= 0) continue
    unique.add(trimmed)
  }
  return Array.from(unique)
}

function partitionFlattenedFixtureByChannelFamily(
  fixture: FlattenedFixture
): FlattenedFixture[] {
  if (fixture.channels.length <= 1) {
    return [fixture]
  }

  const buckets = new Map<ChannelFamilyGroup, [number, FixtureChannel][]>()
  for (const [channelNumber, channel] of fixture.channels) {
    const family = primaryChannelFamily(channel)
    const familyChannels = buckets.get(family) ?? []
    familyChannels.push([channelNumber, channel])
    buckets.set(family, familyChannels)
  }

  if (buckets.size <= 1 && buckets.has('other')) {
    return [fixture]
  }

  const splitFixtures: FlattenedFixture[] = []
  for (const [family, familyChannels] of buckets.entries()) {
    if (familyChannels.length <= 0) continue
    const derivedGroup = channelFamilyGroupName(family)
    splitFixtures.push({
      ...fixture,
      channels: familyChannels,
      groups:
        derivedGroup === undefined
          ? uniqueGroups(fixture.groups)
          : uniqueGroups([...fixture.groups, derivedGroup]),
    })
  }
  return splitFixtures.length > 0 ? splitFixtures : [fixture]
}
/**
 * How far past the hard overlap edge the soft fade extends, in units of the moving
 * window width. Quadratic tail so high feather values add noticeably more reach.
 */
function positionFeatherReachWidths(feather: Normalized): number {
  const f = clampNormalized(feather)
  if (f <= 0) return 0
  // f=1 → 2.25× moving window width (was 1×); low values stay close to linear.
  return f * (1 + f * 1.25)
}

/** Smooth falloff 1 at hard edge → 0 at outer feather limit (perceptually softer than linear). */
function positionFeatherFalloff01(overflow01: number): number {
  const t = clampNormalized(overflow01)
  return 1 - t * t * (3 - 2 * t)
}

/** Overlap multiplier for one axis; `feather` softens the edge past the cyan box (0 = hard gate). */
export function windowAxisOverlapMultiplier(
  fixtureWindow: Window | undefined,
  movingWindow: Window | undefined,
  feather: Normalized = 0
): number {
  if (fixtureWindow && movingWindow) {
    const centerDistance = Math.abs(fixtureWindow.pos - movingWindow.pos)
    const combinedHalfSpan =
      fixtureWindow.width / 2 + movingWindow.width / 2
    if (combinedHalfSpan <= 0) {
      return centerDistance <= 1e-9 ? 1.0 : 0.0
    }
    const overflow = centerDistance - combinedHalfSpan
    if (overflow <= 0) return 1.0
    const f = clampNormalized(feather)
    if (f <= 0) return 0.0
    const featherReach =
      positionFeatherReachWidths(f) * Math.max(movingWindow.width, 0.02)
    if (featherReach <= 0) return 0.0
    return positionFeatherFalloff01(overflow / featherReach)
  }
  return 1.0
}

export function getWindowMultiplier2D(
  fixtureWindow: Window2D_t,
  movingWindow: Window2D_t,
  feather: Normalized = 0
) {
  const f = clampNormalized(feather)
  const axes: number[] = [
    windowAxisOverlapMultiplier(fixtureWindow.x, movingWindow.x, f),
    windowAxisOverlapMultiplier(fixtureWindow.y, movingWindow.y, f),
  ]
  if (fixtureWindow.z !== undefined && movingWindow.z !== undefined) {
    axes.push(
      windowAxisOverlapMultiplier(fixtureWindow.z, movingWindow.z, f)
    )
  }
  // Geometric mean: corners stay brighter than raw X×Y×Z product at high feather.
  const product = axes.reduce((acc, v) => acc * v, 1)
  return Math.pow(product, 1 / axes.length)
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

/** Mid-slot DMX for gobo/prism ranges (same stability idea as color-wheel slots). */
function mapSlotMaxToMidpointDmx(sortedMaxValues: number[]): number[] {
  return sortedMaxValues.map((maxValue, index) => {
    const previousMax =
      index > 0 ? sortedMaxValues[index - 1]! : DMX_MIN_VALUE - 1
    const rangeMin = Math.min(
      DMX_MAX_VALUE,
      Math.max(DMX_MIN_VALUE, previousMax + 1)
    )
    const rangeMax = Math.min(DMX_MAX_VALUE, Math.max(rangeMin, maxValue))
    return rangeMin >= rangeMax
      ? rangeMax
      : Math.round((rangeMin + rangeMax) / 2)
  })
}

function getIndexedMapSlotOutputDmx(
  items: Array<{ max: number }>,
  selectedIndex: number
): number {
  const valid = items
    .map((item, index) => ({
      index,
      max: clampColorMapDmxValue(item.max, DMX_DEFAULT_VALUE),
    }))
    .filter((item) => Number.isFinite(item.max))
    .sort((left, right) => left.max - right.max)

  if (valid.length === 0) {
    return DMX_DEFAULT_VALUE
  }

  const midpoints = mapSlotMaxToMidpointDmx(valid.map((item) => item.max))
  const byOriginalIndex = new Map<number, number>()
  valid.forEach((item, sortedIndex) => {
    byOriginalIndex.set(item.index, midpoints[sortedIndex]!)
  })

  return (
    byOriginalIndex.get(selectedIndex) ??
    midpoints[Math.min(selectedIndex, midpoints.length - 1)] ??
    DMX_DEFAULT_VALUE
  )
}

/** Ordered color-wheel slots used for DMX output and the live color-wheel UI. */
export function listColorMapSlots(channel: ChannelColorMap): IndexedColorMapEntry[] {
  return getColorMapLookup(channel)
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
    case 'fxtrTrigger':
      return ch.off
    case 'fxtrLevel':
      return ch.default
    case 'custom':
      return ch.default
    case 'split': {
      const ranges = getSplitRanges(ch)
      if (ranges.length <= 0) {
        return DMX_DEFAULT_VALUE
      }
      let combined = ranges[0].min
      let bestActivity = Number.NEGATIVE_INFINITY
      for (const range of ranges) {
        const nestedDefault = getDefaultDmxValue(range.channel)
        const clamped = Math.min(range.max, Math.max(range.min, nestedDefault))
        const activity = splitRangeActivity(clamped, range.min, range.max)
        if (activity > bestActivity) {
          bestActivity = activity
          combined = clamped
        }
      }
      return combined
    }
    case 'goboMap': {
      if (ch.gobos.length <= 0) return DMX_DEFAULT_VALUE
      const defaultIndex = Math.max(
        0,
        Math.min(Math.round(ch.defaultIndex), ch.gobos.length - 1)
      )
      return getIndexedMapSlotOutputDmx(ch.gobos, defaultIndex)
    }
    case 'focus':
      return ch.default
    case 'prismMap': {
      if (ch.prisms.length <= 0) return DMX_DEFAULT_VALUE
      const defaultIndex = Math.max(
        0,
        Math.min(Math.round(ch.defaultIndex), ch.prisms.length - 1)
      )
      return getIndexedMapSlotOutputDmx(ch.prisms, defaultIndex)
    }
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

const SYNTHETIC_STROBE_OFF_THRESHOLD = 0.02
const SYNTHETIC_STROBE_MIN_HZ = 0.5
const DEFAULT_SYNTHETIC_STROBE_FRAME_RATE_HZ = 30
const AXIS_FINE_SNAP_DEADBAND_DMX = 0.06

export type MoverAxisOverrides = {
  panDmx?: number
  tiltDmx?: number
  panFineEnabled?: boolean
  tiltFineEnabled?: boolean
}

export type MoverAxisPhysicalCalibration = {
  min: number
  max: number
  invert: boolean
}

function clampAxisPhysicalDmxValue(
  value: number,
  fallback: number = DMX_MIN_VALUE
): number {
  if (!Number.isFinite(value)) {
    return fallback
  }

  return Math.min(DMX_MAX_VALUE, Math.max(DMX_MIN_VALUE, value))
}

/** Pad 0..1 -> calibrated axis DMX across physical min/max (Free Aim). */
export function mapNormalizedToAxisPhysicalDmx(
  normalized: number,
  calibration?: MoverAxisPhysicalCalibration
): number {
  const safe = clampNormalized(normalized)

  if (calibration === undefined) {
    return clampAxisPhysicalDmxValue(safe * DMX_MAX_VALUE)
  }

  const min = clampAxisDmxValue(calibration.min, DMX_MIN_VALUE)
  const max = clampAxisDmxValue(calibration.max, DMX_MAX_VALUE)
  const oriented = calibration.invert ? 1 - safe : safe
  return clampAxisPhysicalDmxValue(lerp(min, max, oriented))
}

/** Calibrated axis DMX -> pad 0..1 across physical min/max (Free Aim). */
export function mapAxisPhysicalDmxToNormalized(
  dmx: number,
  calibration?: MoverAxisPhysicalCalibration
): number {
  if (!Number.isFinite(dmx)) {
    return 0
  }

  if (calibration === undefined) {
    return clampNormalized(dmx / DMX_MAX_VALUE)
  }

  const min = clampAxisDmxValue(calibration.min, DMX_MIN_VALUE)
  const max = clampAxisDmxValue(calibration.max, DMX_MAX_VALUE)
  const low = Math.min(min, max)
  const high = Math.max(min, max)
  const clamped = Math.min(high, Math.max(low, dmx))
  const span = Math.max(1e-6, Math.abs(max - min))
  const oriented = max >= min ? (clamped - min) / span : (min - clamped) / span
  return clampNormalized(calibration.invert ? 1 - oriented : oriented)
}

function mapAxisWithCalibration(
  axisValue: Normalized,
  axisCalibration?: MoverAxisPhysicalCalibration
): Normalized {
  const dmx = mapNormalizedToAxisPhysicalDmx(axisValue, axisCalibration)
  return clampNormalized(dmx / DMX_MAX_VALUE)
}

function axisOverrideDmxToNormalized(
  dmxValue: number | undefined,
  coarseChannel: ChannelAxis | undefined
): Normalized | null {
  if (dmxValue === undefined || !Number.isFinite(dmxValue) || coarseChannel === undefined) {
    return null
  }

  const min = clampAxisDmxValue(coarseChannel.min, DMX_MIN_VALUE)
  const max = clampAxisDmxValue(coarseChannel.max, DMX_MAX_VALUE)
  const low = Math.min(min, max)
  const high = Math.max(min, max)
  const clamped = Math.min(high, Math.max(low, dmxValue))
  const span = Math.max(1e-6, Math.abs(max - min))

  if (max >= min) {
    return clampNormalized((clamped - min) / span)
  }

  return clampNormalized((min - clamped) / span)
}

function axisOverrideDmxToChannelValue(
  channel: ChannelAxis,
  dmxValue: number | undefined,
  fixture: FlattenedFixture,
  fineEnabled: boolean = true
): DmxValue | null {
  if (dmxValue === undefined || !Number.isFinite(dmxValue)) {
    return null
  }

  const coarseChannel = channel.isFine
    ? getCoarseAxisChannel(fixture, channel.dir)
    : channel
  if (coarseChannel === undefined) {
    return null
  }

  const min = clampAxisDmxValue(coarseChannel.min, DMX_MIN_VALUE)
  const max = clampAxisDmxValue(coarseChannel.max, DMX_MAX_VALUE)
  const low = Math.min(min, max)
  const high = Math.max(min, max)

  let clamped = Math.min(high, Math.max(low, dmxValue))
  const nearestStep = Math.round(clamped)
  if (Math.abs(clamped - nearestStep) <= AXIS_FINE_SNAP_DEADBAND_DMX) {
    clamped = nearestStep
  }
  if (!fineEnabled) {
    // While travelling, keep output on coarse DMX steps to avoid fine-channel chatter.
    clamped = Math.round(clamped)
  }

  const increasing = max >= min
  const oriented = increasing ? clamped - min : min - clamped
  const orientedWhole = Math.floor(oriented + 0.000001)
  const orientedFraction = Math.min(
    1,
    Math.max(0, oriented - orientedWhole)
  )
  const coarseValue = increasing ? min + orientedWhole : min - orientedWhole
  const fineValue = clampAxisDmxValue(
    Math.round(orientedFraction * DMX_MAX_VALUE),
    DMX_MIN_VALUE
  )

  if (channel.isFine) {
    if (!fineEnabled) {
      // Hold fine channels at center while coarse handles large travel.
      // Fine should only engage near settle for pinpoint adjustment.
      return Math.floor(rLerp(channel, 0.5))
    }
    return Math.floor(rLerp(channel, fineValue / DMX_MAX_VALUE))
  }

  return clampAxisDmxValue(coarseValue, min)
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

/** True when this mapped partition selects color via a wheel/map and uses master for dimming. */
function partitionBrightnessUsesMasterChannel(
  fixture: FlattenedFixture
): boolean {
  for (const [, channel] of fixture.channels) {
    if (channel.type === 'colorMap') {
      return true
    }
    if (channel.type === 'split') {
      for (const range of channel.ranges) {
        if (range.channel.type === 'colorMap') {
          return true
        }
      }
    }
  }
  return false
}

export function getDmxValue(
  ch: FixtureChannel,
  params: Params,
  fixture: FlattenedFixture,
  master: number,
  randomizerLevel: number,
  timeState: TimeState,
  syntheticStrobeFrameRateHz: number = DEFAULT_SYNTHETIC_STROBE_FRAME_RATE_HZ,
  axisOverrides?: MoverAxisOverrides,
  placementDepth2DOnly: boolean = false
): DmxValue {
  const movingWindow = getMovingWindow(params, placementDepth2DOnly)

  switch (ch.type) {
    case 'split': {
      const ranges = getSplitRanges(ch)
      if (ranges.length <= 0) {
        return DMX_DEFAULT_VALUE
      }

      let combined = ranges[0].min
      let bestActivity = Number.NEGATIVE_INFINITY
      for (const range of ranges) {
        const nestedValue = getDmxValue(
          range.channel,
          params,
          fixture,
          master,
          randomizerLevel,
          timeState,
          syntheticStrobeFrameRateHz,
          axisOverrides,
          placementDepth2DOnly
        )
        const clampedValue = Math.min(
          range.max,
          Math.max(range.min, nestedValue)
        )
        const activity = splitRangeActivity(clampedValue, range.min, range.max)
        if (activity > bestActivity) {
          bestActivity = activity
          combined = clampedValue
        }
      }

      return combined
    }
    case 'master': {
      // Fixture master dimmer follows the global master + split brightness only,
      // not spatial X/Y pad windows (those gate RGB/aux emitters per subfixture).
      const level = master * getParam(params, 'brightness')
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

      const brightnessViaMaster = partitionBrightnessUsesMasterChannel(fixture)
      const outputScale = brightnessViaMaster
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
        const channelOverrideValue = axisOverrideDmxToChannelValue(
          ch,
          axisOverrides?.panDmx,
          fixture,
          axisOverrides?.panFineEnabled !== false
        )
        if (channelOverrideValue !== null) {
          return channelOverrideValue
        }

        const coarseChannel = ch.isFine ? getCoarseAxisChannel(fixture, 'x') : ch
        const panOverride = axisOverrideDmxToNormalized(
          axisOverrides?.panDmx,
          coarseChannel
        )
        const panValue =
          panOverride ??
          mapAxisWithCalibration(
            getParam(params, 'xAxis'),
            fixture.moverCalibration?.pan
          )

        const panMirrorAmount = 0

        return calculate_axis_channel(
          ch,
          panValue,
          fixture.window?.x?.pos,
          panMirrorAmount,
          fixture
        )
      } else {
        const channelOverrideValue = axisOverrideDmxToChannelValue(
          ch,
          axisOverrides?.tiltDmx,
          fixture,
          axisOverrides?.tiltFineEnabled !== false
        )
        if (channelOverrideValue !== null) {
          return channelOverrideValue
        }

        const coarseChannel = ch.isFine ? getCoarseAxisChannel(fixture, 'y') : ch
        const tiltOverride = axisOverrideDmxToNormalized(
          axisOverrides?.tiltDmx,
          coarseChannel
        )
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
      const indexedColors = getColorMapLookup(ch)
      if (indexedColors.length === 0) {
        return DMX_DEFAULT_VALUE
      }

      const rawColorWheel = params.colorWheel
      if (Number.isFinite(rawColorWheel)) {
        const selectedIndex = Math.max(
          0,
          Math.min(
            indexedColors.length - 1,
            Math.round(
              clampNormalized(rawColorWheel as number) * (indexedColors.length - 1)
            )
          )
        )
        return indexedColors[selectedIndex]!.outputDmx
      }

      const hue = clampNormalized(getParam(params, 'hue'))
      const saturation = clampNormalized(getParam(params, 'saturation'))

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

      return getIndexedMapSlotOutputDmx(ch.gobos, selectedIndex)
    }
    case 'focus': {
      const rawFocus = params.focus
      if (!Number.isFinite(rawFocus)) {
        return ch.default
      }
      return rLerp(ch, clampNormalized(rawFocus as number))
    }
    case 'prismMap': {
      const prismCount = ch.prisms.length
      if (prismCount <= 0) return DMX_DEFAULT_VALUE

      const rawPrismSelection = params.prism
      const selectedIndex = Number.isFinite(rawPrismSelection)
        ? Math.max(
            0,
            Math.min(
              prismCount - 1,
              Math.round(clampNormalized(rawPrismSelection as number) * (prismCount - 1))
            )
          )
        : Math.max(0, Math.min(Math.round(ch.defaultIndex), prismCount - 1))

      return getIndexedMapSlotOutputDmx(ch.prisms, selectedIndex)
    }
    case 'custom': {
      const customParam = params[ch.name]
      if (customParam === undefined) {
        return ch.default
      } else {
        return rLerp(ch, customParam)
      }
    }
    case 'fxtrTrigger':
      return ch.off
    case 'fxtrLevel': {
      const customParam = params[ch.name]
      if (customParam === undefined) {
        return ch.default
      }
      return rLerp(ch, customParam)
    }
    default:
      return DMX_DEFAULT_VALUE
  }
}

export function getWindowRandomizerLevel(
  params: Params,
  randomizerLevel: Normalized,
  fixtureWindow: Window2D_t,
  movingWindow: Window2D_t
): Normalized {
  const windowLevel = getWindowMultiplier2D(
    fixtureWindow,
    movingWindow,
    getParam(params, 'positionFeather')
  )
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

export function getMovingWindow(
  params: Params,
  placementDepth2DOnly: boolean = false
): Window2D_t {
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

  if (
    !placementDepth2DOnly &&
    (params.z !== undefined || params.depth !== undefined)
  ) {
    const zPos = clampNormalized(getParam(params, 'z'))
    const depth = clampNormalized(getParam(params, 'depth'))
    const zCenterReference = Number(params.zCenterReference ?? 0)
    const isDanceCenter = Number.isFinite(zCenterReference) && zCenterReference > 0.5

    // Dance-center depth behaves like XY width/height (symmetric around Z).
    // Stage-center depth uses Z as the stage-edge anchor (0 at stage, 1 at far edge).
    if (isDanceCenter) {
      movingWindow.z = {
        pos: zPos,
        width: depth,
      }
    } else {
      const stageStart = zPos
      const stageEnd = clampNormalized(stageStart + depth)
      const internalStart = 1 - stageStart
      const internalEnd = 1 - stageEnd
      const min = Math.min(internalStart, internalEnd)
      const max = Math.max(internalStart, internalEnd)
      movingWindow.z = {
        pos: (min + max) / 2,
        width: max - min,
      }
    }
  }

  return movingWindow
}

export function getFixturesInGroups(
  fixtures: FlattenedFixture[],
  scene_groups: { [key: string]: boolean | undefined }
) {
  function fixtureMatchesGroup(fixture: FlattenedFixture, group: string) {
    if (group === 'Visualizer') {
      // Visualizer is a virtual group with no physical DMX fixtures.
      return false
    }
    if (group === 'Atmosphere') {
      return fixture.channels.some(([, channel]) => {
        if (channel.type === 'fxtrTrigger' || channel.type === 'fxtrLevel') {
          return true
        }
        if (channel.type !== 'custom' || channel.isControllable !== true) {
          return false
        }
        const name = channel.name.trim().toLowerCase()
        if (name.length <= 0) {
          return false
        }
        if (
          ['pan', 'tilt', 'speed', 'gobo', 'prism', 'zoom', 'focus'].some((token) =>
            name.includes(token)
          )
        ) {
          return false
        }
        return [
          'volume',
          'fan',
          'fog',
          'haze',
          'bubble',
          'confetti',
          'co2',
          'flame',
          'pyro',
          'output',
          'pump',
          'mist',
          'jet',
          'trigger',
          'on/off',
          'on off',
          'onoff',
          'fx',
        ].some((token) => name.includes(token))
      })
    }
    if (group === 'Movers') {
      if (fixture.moverCalibration !== undefined) return true
      if (fixture.moverBounds !== undefined) return true
      return fixture.channels.some(([, channel]) => {
        return (
          channel.type === 'axis' &&
          (channel.dir === 'x' || channel.dir === 'y')
        )
      })
    }
    return fixture.groups.includes(group)
  }

  return fixtures.filter((fixture) =>
    evaluateSceneGroups(scene_groups, (group) =>
      fixtureMatchesGroup(fixture, group)
    )
  )
}

export function getSortedGroupsForFixture(
  fixture: Fixture,
  _fixtureType: FixtureType
) {
  return normalizeFixtureGroupList(fixture.groups).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  )
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
    for (const sub of fixtureType.subFixtures) {
      for (const group of sub.groups) {
        groupSet.add(group)
      }
    }
    for (const channel of fixtureType.channels) {
      for (const family of inferChannelFamilies(channel)) {
        const familyGroup = channelFamilyGroupName(family)
        if (familyGroup !== undefined) {
          groupSet.add(familyGroup)
        }
      }
    }
  }
  return Array.from(groupSet.keys()).sort((a, b) => (a > b ? 1 : -1))
}

/**
 * Like {@link getSortedGroups}, but only considers fixture **types that appear on the DMX
 * universe** (placed fixtures). Omits groups defined only on fixture definitions that are
 * not currently used — keeps split / scene group pickers aligned with the active rig.
 */
export function getSortedGroupsFromPlacedFixtures(
  universe: Universe,
  fixtureTypesById: { [id: string]: FixtureType }
) {
  return getFixtureGroupPickerOptions(universe, fixtureTypesById)
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

function getSplitRanges(
  channel: Extract<FixtureChannel, { type: 'split' }>
): Array<{ min: number; max: number; channel: LeafFixtureChannel }> {
  return channel.ranges.map((range) => ({
    min: Math.min(range.min, range.max),
    max: Math.max(range.min, range.max),
    channel: range.channel,
  }))
}

function splitRangeActivity(
  value: number,
  min: number,
  max: number
): number {
  const span = Math.max(1, max - min)
  return clampNormalized((value - min) / span)
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

  return fixtureType.name.trim().length > 0 ? fixtureType.name : 'Mover Group'
}

function moverGroupWithOrientation(
  groupName: string,
  orientation: Fixture['moverMountOrientation']
): string {
  const normalizedGroupName = groupName
    .trim()
    .replace(/\s+\((Upright|Hung)\)$/i, '')
  const suffix = orientation === 'inverted' ? 'Hung' : 'Upright'
  return `${normalizedGroupName} (${suffix})`
}

export function flatten_fixture(
  fixture: Fixture,
  fixture_type: FixtureType,
  base_channel: number, // DMX Channel assigned to the fixture
  moverGroupByFixtureId?: { [fixtureId: string]: string }
): FlattenedFixture[] {
  let subfixture_ch_indexes: Set<number> = new Set()

  const groups = [...fixture.groups]

  const fixtureId =
    typeof fixture.id === 'string' && fixture.id.trim().length > 0
      ? fixture.id
      : undefined

  const moverGroup =
    moverGroupWithOrientation(
      moverGroupByFixtureId?.[fixtureId ?? ''] ??
        defaultMoverGroupName(fixture, fixture_type),
      fixture.moverMountOrientation
    )

  const moverCalibration = isMoverFixtureType(fixture_type)
    ? fixture_type.moverCalibration ?? initMoverCalibration()
    : undefined

  const resolvedEmitters = resolvedEmittersForFixtureType(fixture_type)

  let flattened: FlattenedFixture[] = fixture_type.subFixtures.map((sub, subIndex) => {
    const subEmitters = emittersForSubfixtureIndex(
      fixture_type,
      resolvedEmitters,
      subIndex
    )
    const centroid = computeEmitterCentroid(subEmitters)
    const effectiveRelative =
      centroid !== null
        ? mergeSubRelativeWindowWithEmitterCentroid(
            sub.relative_window,
            centroid,
            fixture.window
          )
        : sub.relative_window

    return {
      intensity: sub.intensity ?? fixture_type.intensity,
      window: effectiveRelative
        ? window2DToParentCoords(effectiveRelative, fixture.window)
        : fixture.window,
      channels: sub.channels.map((ch_index) => {
        subfixture_ch_indexes.add(ch_index)
        return [base_channel + ch_index, fixture_type.channels[ch_index]]
      }),
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
    groups,
    fixtureId,
    fixtureTypeId: fixture_type.id,
    moverGroup,
    moverCalibration,
    moverBounds: fixture.moverBounds,
    moverMountOrientation: fixture.moverMountOrientation,
  })

  // Further split each flattened fixture into channel-family partitions so
  // split groups can target WW/CW/RGB/etc independently while preserving each
  // subfixture's spatial mapping window.
  flattened = flattened
    .flatMap((fixtureItem) => partitionFlattenedFixtureByChannelFamily(fixtureItem))
    .filter((fixtureItem) => fixtureItem.channels.length > 0)

  // Only return fixtures that actually have channels.
  // This improves the behavior of the randomizer engine.
  return flattened
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

