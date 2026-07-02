import {
  DMX_MAX_VALUE,
  DMX_MIN_VALUE,
  DMX_NUM_CHANNELS,
  FlattenedFixture,
  normalizeDmxUniverseChannels,
  universeHasMovers,
  MoverBounds,
  zeroUnpatchedDmxChannels,
} from '../../shared/dmxFixtures'
import {
  fixtureChannelHasColorMap,
  fixtureChannelHasGoboMap,
  fixtureChannelHasPrismMap,
  getFixtureMapCalibrationOverrideValue,
} from '../../shared/fixtureMapCalibration'
import { FixtureChannel } from '../../shared/dmxFixtures'
import { CleanReduxState } from '../../renderer/redux/store'
import {
  getDmxValue,
  getFixturesInGroups,
  flatten_fixtures,
  forEachChannel,
  getDefaultDmxValue,
  getMovingWindow,
  mapNormalizedToAxisPhysicalDmx,
  type MoverAxisOverrides,
} from '../../shared/dmxUtil'
import { indexArray, zip } from '../../shared/util'
import { TimeState } from '../../shared/TimeState'
import { SplitState } from 'renderer/redux/realtimeStore'
import { getUniverseOverwrites } from '../../renderer/redux/mixerSlice'
import { clampNormalized, lerp } from '../../math/util'
import { getParam, type Params } from '../../shared/params'
import {
  getVisualizerDriverOutputParams,
  mergeParamsWithStageLightSample,
  stageLightMapMasterFromEffects,
} from '../../shared/stageLightMap'
import { getLatestStageLightMap } from './stageLightMapRuntime'

const PAN_EQUIVALENT_CYCLE_DEG = 360
const _panPathYawByFixtureKey = new Map<string, number>()
type MoverPathState = {
  panDmx: number
  tiltDmx: number
  panTargetDmx: number
  tiltTargetDmx: number
  panVelocityDmxPerSec: number
  tiltVelocityDmxPerSec: number
  panFineEnabled: boolean
  tiltFineEnabled: boolean
  lastSeenMs: number
}
const _moverPathStateByFixtureKey = new Map<string, MoverPathState>()
let _lastMoverPathCleanupMs = 0
const MOVER_PATH_MAX_DT_SEC = 0.12
const MOVER_PATH_MIN_DT_SEC = 1 / 240
const MOVER_PATH_MAX_PAN_DMX_PER_SEC = 360
const MOVER_PATH_MAX_TILT_DMX_PER_SEC = 320

function readDmxChannel(channels: number[], channelIdx: number): number {
  if (channelIdx < 0 || channelIdx >= DMX_NUM_CHANNELS) return 0
  const v = channels[channelIdx]
  return Number.isFinite(v) ? v : 0
}

function writeDmxChannel(channels: number[], channelIdx: number, value: number): void {
  if (channelIdx < 0 || channelIdx >= DMX_NUM_CHANNELS) return
  channels[channelIdx] = value
}
const MOVER_PATH_MAX_PAN_ACCEL_DMX_PER_SEC2 = 1700
const MOVER_PATH_MAX_TILT_ACCEL_DMX_PER_SEC2 = 1400
const MOVER_PATH_STATE_STALE_MS = 15000
const MOVER_PATH_TARGET_DEADBAND_DMX = 0.05
const MOVER_PATH_SETTLE_DISTANCE_DMX = 0.08
const MOVER_PATH_SETTLE_VELOCITY_DMX_PER_SEC = 0.9
const MOVER_PATH_IDLE_HOLD_DISTANCE_DMX = 0.2
const MOVER_PATH_IDLE_HOLD_VELOCITY_DMX_PER_SEC = 0.6
const MOVER_FINE_ENABLE_DISTANCE_DMX = 0.35
const MOVER_FINE_ENABLE_VELOCITY_DMX_PER_SEC = 5.5
const MOVER_FINE_DISABLE_DISTANCE_DMX = 1.5
const MOVER_FINE_DISABLE_VELOCITY_DMX_PER_SEC = 20
const SPLIT_PAN_RANGE_DEG = 360
const MOVER_TANDEM_MAX_SPREAD = 0.65
const LIGHTING_CONTROL_PARAM_KEYS = [
  'hue',
  'saturation',
  'brightness',
  'white',
  'warmWhite',
  'amber',
  'uv',
  'x',
  'y',
  'width',
  'height',
  'z',
  'depth',
  'intensity',
  'strobe',
  'randomize',
  'visStageMapMix',
] as const

function splitHasLightingControlBundle(
  params: Record<string, number | undefined>
) {
  return LIGHTING_CONTROL_PARAM_KEYS.some((param) => params[param] !== undefined)
}

function isAtmosCustomChannelName(name: string) {
  if (name.length <= 0) return false
  const exclusions = ['pan', 'tilt', 'speed', 'gobo', 'prism', 'zoom', 'focus']
  if (exclusions.some((token) => name.includes(token))) {
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
}

function isAtmosControlChannel(
  channel: FlattenedFixture['channels'][number][1]
) {
  if (channel.type === 'fxtrTrigger' || channel.type === 'fxtrLevel') {
    return true
  }
  if (channel.type !== 'custom' || channel.isControllable !== true) {
    return false
  }
  return isAtmosCustomChannelName(channel.name.trim().toLowerCase())
}

function getUniverseCount(state: CleanReduxState): number {
  const configuredUniverseCount =
    state.control.device.connectionSettings.universeCount ?? 1

  const maxFixtureUniverse = state.dmx.universe.reduce((maxUniverse, fixture) => {
    const fixtureUniverse = fixture.universe ?? 1
    return Math.max(maxUniverse, fixtureUniverse)
  }, 1)

  return Math.max(1, configuredUniverseCount, maxFixtureUniverse)
}

import {
  getConfiguredDmxOutputRateHz as getConfiguredDmxOutputRateHzFromDevice,
} from '../../shared/dmxOutputRate'

export function getConfiguredDmxOutputRateHz(state: CleanReduxState): number {
  return getConfiguredDmxOutputRateHzFromDevice(state.control.device)
}

export function getDmxComputeIntervalMs(state: CleanReduxState): number {
  return 1000 / getConfiguredDmxOutputRateHz(state)
}

function getSyntheticStrobeFrameRateHz(state: CleanReduxState): number {
  return getConfiguredDmxOutputRateHz(state)
}

function clampDmxValue(value: number, fallback: number = 128): number {
  if (!Number.isFinite(value)) {
    return fallback
  }

  return Math.min(DMX_MAX_VALUE, Math.max(DMX_MIN_VALUE, Math.round(value)))
}

function clampDmxFloatValue(value: number, fallback: number = 128): number {
  if (!Number.isFinite(value)) {
    return fallback
  }

  return Math.min(DMX_MAX_VALUE, Math.max(DMX_MIN_VALUE, value))
}

function resolveMoverPathDtSeconds(timeState: TimeState): number {
  const dtMs = Number(timeState.dt)
  if (!Number.isFinite(dtMs) || dtMs <= 0) {
    return 1 / 90
  }

  return Math.min(
    MOVER_PATH_MAX_DT_SEC,
    Math.max(MOVER_PATH_MIN_DT_SEC, dtMs / 1000)
  )
}

function stepPathAxisValue(
  currentValue: number,
  currentVelocity: number,
  targetValue: number,
  dtSec: number,
  maxVelocity: number,
  maxAcceleration: number,
  minValue: number,
  maxValue: number
): { value: number; velocity: number } {
  const clampedTarget = Math.min(maxValue, Math.max(minValue, targetValue))

  if (!Number.isFinite(currentValue) || !Number.isFinite(currentVelocity)) {
    return {
      value: clampedTarget,
      velocity: 0,
    }
  }
  if (!Number.isFinite(dtSec) || dtSec <= 0.000001) {
    return {
      value: Math.min(maxValue, Math.max(minValue, currentValue)),
      velocity: currentVelocity,
    }
  }

  const distance = clampedTarget - currentValue
  if (Math.abs(distance) <= 0.0001) {
    return {
      value: clampedTarget,
      velocity: 0,
    }
  }

  const safeDt = Math.max(MOVER_PATH_MIN_DT_SEC, dtSec)
  const desiredVelocity = Math.min(
    maxVelocity,
    Math.max(-maxVelocity, distance / safeDt)
  )
  const velocityDeltaLimit = maxAcceleration * safeDt
  const nextVelocity = Math.min(
    currentVelocity + velocityDeltaLimit,
    Math.max(currentVelocity - velocityDeltaLimit, desiredVelocity)
  )

  let nextValue = currentValue + nextVelocity * safeDt
  if (
    (distance > 0 && nextValue > clampedTarget) ||
    (distance < 0 && nextValue < clampedTarget)
  ) {
    nextValue = clampedTarget
    return {
      value: nextValue,
      velocity: 0,
    }
  }

  nextValue = Math.min(maxValue, Math.max(minValue, nextValue))
  if (
    nextValue <= minValue + 0.0001 ||
    nextValue >= maxValue - 0.0001
  ) {
    return {
      value: nextValue,
      velocity: 0,
    }
  }

  return {
    value: nextValue,
    velocity: nextVelocity,
  }
}

function cleanupMoverPathState(nowMs: number) {
  if (nowMs - _lastMoverPathCleanupMs < 1000) {
    return
  }
  _lastMoverPathCleanupMs = nowMs

  for (const [key, state] of _moverPathStateByFixtureKey.entries()) {
    if (nowMs - state.lastSeenMs > MOVER_PATH_STATE_STALE_MS) {
      _moverPathStateByFixtureKey.delete(key)
      _panPathYawByFixtureKey.delete(key)
    }
  }
}

function hasMoverAxisChannels(fixture: FlattenedFixture): boolean {
  return fixture.channels.some(([, channel]) => {
    return channel.type === 'axis' && !channel.isFine
  })
}

function fixtureCenterPosition(
  fixture: FlattenedFixture
): { x: number; y: number } {
  return {
    x: clampNormalized(fixture.window?.x?.pos ?? 0.5),
    y: clampNormalized(fixture.window?.y?.pos ?? 0.5),
  }
}

function getMoverPlannerKey(
  fixture: FlattenedFixture,
  plannerNamespace: string
): string {
  let panChannelNumber = -1
  let tiltChannelNumber = -1

  fixture.channels.forEach(([channelNumber, channel]) => {
    if (channel.type !== 'axis' || channel.isFine) return
    if (channel.dir === 'x' && panChannelNumber < 0) {
      panChannelNumber = channelNumber
      return
    }
    if (channel.dir === 'y' && tiltChannelNumber < 0) {
      tiltChannelNumber = channelNumber
    }
  })

  const fixtureIdPart =
    typeof fixture.fixtureId === 'string' && fixture.fixtureId.trim().length > 0
      ? fixture.fixtureId.trim()
      : `anon-${fixture.fixtureTypeId ?? 'fixture'}`

  return `${plannerNamespace}:${fixtureIdPart}:x${panChannelNumber}:y${tiltChannelNumber}`
}

function orientDmxValue(
  value: number,
  min: number,
  max: number,
  invert: boolean
): number {
  return invert ? min + max - value : value
}

function unorientDmxValue(
  value: number,
  min: number,
  max: number,
  invert: boolean
): number {
  return invert ? min + max - value : value
}

function mapPanNormalizedToDmx(
  normalized: number,
  calibration?: {
    min: number
    max: number
    front: number
    back: number
    home?: number
    rangeDeg?: number
    invert: boolean
  },
  plannerKey?: string,
  rangeDegOverride?: number,
  options?: {
    centerAnchor?: 'front' | 'home'
  }
): number {
  const safeNormalized = clampNormalized(normalized)
  const hasRangeOverride = Number.isFinite(rangeDegOverride)
  if (calibration === undefined) {
    if (plannerKey !== undefined) {
      _panPathYawByFixtureKey.delete(plannerKey)
    }
    return clampDmxFloatValue(safeNormalized * DMX_MAX_VALUE)
  }

  const min = clampDmxValue(calibration.min, DMX_MIN_VALUE)
  const max = clampDmxValue(calibration.max, DMX_MAX_VALUE)
  const span = Math.max(1, Math.abs(max - min))
  const calibrationRangeDeg = Math.max(
    45,
    Math.min(
      1440,
      Number.isFinite(calibration.rangeDeg) ? calibration.rangeDeg ?? 540 : 540
    )
  )
  const rangeDeg = Number.isFinite(rangeDegOverride)
    ? Math.max(45, Math.min(1440, rangeDegOverride as number))
    : calibrationRangeDeg

  const orientedMin = orientDmxValue(min, min, max, calibration.invert)
  const orientedMax = orientDmxValue(max, min, max, calibration.invert)
  const orientedFront = orientDmxValue(
    clampDmxFloatValue(calibration.front, min),
    min,
    max,
    calibration.invert
  )
  const orientedBack = orientDmxValue(
    clampDmxFloatValue(calibration.back, min),
    min,
    max,
    calibration.invert
  )
  const homeRaw = Number(calibration.home)
  const orientedHome = orientDmxValue(
    clampDmxFloatValue(
      Number.isFinite(homeRaw) ? homeRaw : calibration.front,
      min
    ),
    min,
    max,
    calibration.invert
  )
  const orientedCenter =
    options?.centerAnchor === 'home' ? orientedHome : orientedFront

  const direction = Math.abs(orientedBack - orientedCenter) > 0.0001
    ? Math.sign(orientedBack - orientedCenter)
    : Math.sign(orientedMax - orientedMin) || 1

  const canonicalYawDeg = (safeNormalized - 0.5) * rangeDeg
  // For explicit split-pad mapping (1 turn), keep yaw deterministic and monotonic
  // across the pad so equivalent-cycle selection cannot flip direction mid-travel.
  if (hasRangeOverride) {
    if (plannerKey !== undefined) {
      _panPathYawByFixtureKey.delete(plannerKey)
    }
    const yawRatio = canonicalYawDeg / Math.max(0.0001, calibrationRangeDeg)
    const orientedDeterministic =
      orientedCenter + direction * yawRatio * span
    const orientedClamped = Math.min(
      Math.max(orientedDeterministic, Math.min(orientedMin, orientedMax)),
      Math.max(orientedMin, orientedMax)
    )
    return clampDmxFloatValue(
      unorientDmxValue(orientedClamped, min, max, calibration.invert),
      min
    )
  }

  const yawAtMin = direction * ((orientedMin - orientedCenter) / span) * rangeDeg
  const yawAtMax = direction * ((orientedMax - orientedCenter) / span) * rangeDeg
  const yawMin = Math.min(yawAtMin, yawAtMax)
  const yawMax = Math.max(yawAtMin, yawAtMax)
  const preferredYaw =
    plannerKey !== undefined
      ? (_panPathYawByFixtureKey.get(plannerKey) ?? 0)
      : 0
  const targetYawDeg = resolveNearestEquivalentPanYaw(
    canonicalYawDeg,
    preferredYaw,
    yawMin,
    yawMax
  )
  if (plannerKey !== undefined) {
    _panPathYawByFixtureKey.set(plannerKey, targetYawDeg)
  }

  const oriented = orientedCenter + direction * (targetYawDeg / rangeDeg) * span
  const orientedClamped = Math.min(
    Math.max(oriented, Math.min(orientedMin, orientedMax)),
    Math.max(orientedMin, orientedMax)
  )
  return clampDmxFloatValue(
    unorientDmxValue(orientedClamped, min, max, calibration.invert),
    min
  )
}

function resolveNearestEquivalentPanYaw(
  canonicalYawDeg: number,
  preferredYawDeg: number,
  minYawDeg: number,
  maxYawDeg: number
): number {
  const low = Math.min(minYawDeg, maxYawDeg)
  const high = Math.max(minYawDeg, maxYawDeg)
  if (!Number.isFinite(low) || !Number.isFinite(high) || low > high) {
    return canonicalYawDeg
  }

  const kMin = Math.ceil((low - canonicalYawDeg) / PAN_EQUIVALENT_CYCLE_DEG)
  const kMax = Math.floor((high - canonicalYawDeg) / PAN_EQUIVALENT_CYCLE_DEG)
  if (kMin > kMax) {
    return Math.min(high, Math.max(low, canonicalYawDeg))
  }

  let bestYaw = canonicalYawDeg + kMin * PAN_EQUIVALENT_CYCLE_DEG
  let bestPrimary = Math.abs(bestYaw - preferredYawDeg)
  let bestSecondary = Math.abs(bestYaw - canonicalYawDeg)

  for (let k = kMin + 1; k <= kMax; k++) {
    const candidateYaw = canonicalYawDeg + k * PAN_EQUIVALENT_CYCLE_DEG
    const primary = Math.abs(candidateYaw - preferredYawDeg)
    const secondary = Math.abs(candidateYaw - canonicalYawDeg)
    const isBetter =
      primary < bestPrimary - 0.0001 ||
      (Math.abs(primary - bestPrimary) <= 0.0001 &&
        (secondary < bestSecondary - 0.0001 ||
          (Math.abs(secondary - bestSecondary) <= 0.0001 &&
            Math.abs(candidateYaw) < Math.abs(bestYaw))))
    if (isBetter) {
      bestYaw = candidateYaw
      bestPrimary = primary
      bestSecondary = secondary
    }
  }

  return bestYaw
}

function mapTiltNormalizedToDmx(
  normalized: number,
  mountOrientation: 'upright' | 'inverted',
  calibration?: {
    min: number
    max: number
    down: number
    forward: number
    up: number
    home?: number
    rangeDeg?: number
    invert: boolean
  },
  options?: {
    centerOnDown?: boolean
    centerAnchor?: 'mount' | 'home'
  }
): number {
  const safeNormalized = clampNormalized(normalized)
  if (calibration === undefined) {
    return clampDmxFloatValue(safeNormalized * DMX_MAX_VALUE)
  }

  const min = clampDmxValue(calibration.min, DMX_MIN_VALUE)
  const max = clampDmxValue(calibration.max, DMX_MAX_VALUE)
  const orientedLow = Math.min(
    orientDmxValue(min, min, max, calibration.invert),
    orientDmxValue(max, min, max, calibration.invert)
  )
  const orientedHigh = Math.max(
    orientDmxValue(min, min, max, calibration.invert),
    orientDmxValue(max, min, max, calibration.invert)
  )
  const orientedMin = orientDmxValue(min, min, max, calibration.invert)
  const orientedMax = orientDmxValue(max, min, max, calibration.invert)
  const orientedForward = orientDmxValue(
    clampDmxFloatValue(calibration.forward, min),
    min,
    max,
    calibration.invert
  )
  const orientedUp = orientDmxValue(
    clampDmxFloatValue(calibration.up, min),
    min,
    max,
    calibration.invert
  )
  const orientedDown = orientDmxValue(
    clampDmxFloatValue(calibration.down, min),
    min,
    max,
    calibration.invert
  )
  const homeRaw = Number(calibration.home)
  const orientedHome = orientDmxValue(
    clampDmxFloatValue(Number.isFinite(homeRaw) ? homeRaw : calibration.forward, min),
    min,
    max,
    calibration.invert
  )
  const centerOnDown = options?.centerOnDown === true
  const preferredCenterAnchor =
    options?.centerAnchor === 'home'
      ? orientedHome
      : centerOnDown
        ? orientedDown
        : mountOrientation === 'inverted'
          ? orientedDown
          : orientedUp
  const fallbackCenterAnchor = centerOnDown
    ? orientedUp
    : mountOrientation === 'inverted'
      ? orientedUp
      : orientedDown
  const clampedForward = Math.min(Math.max(orientedForward, orientedLow), orientedHigh)
  let clampedCenterAnchor = Math.min(
    Math.max(preferredCenterAnchor, orientedLow),
    orientedHigh
  )
  if (Math.abs(clampedCenterAnchor - clampedForward) <= 0.0001) {
    clampedCenterAnchor = Math.min(
      Math.max(fallbackCenterAnchor, orientedLow),
      orientedHigh
    )
  }

  // Center-focused tilt mapping:
  // y=0.5 -> calibrated up/down anchor
  // y=0   -> forward-side limit (min/max depending fixture orientation)
  // y=1   -> behind-side limit
  let forwardDirection = Math.sign(clampedForward - clampedCenterAnchor)
  if (forwardDirection === 0) {
    forwardDirection = Math.sign(orientedMax - orientedMin) || 1
  }
  const forwardLimit = forwardDirection >= 0 ? orientedHigh : orientedLow
  const behindLimit = forwardDirection >= 0 ? orientedLow : orientedHigh
  const signedRatio = safeNormalized * 2 - 1
  const oriented =
    signedRatio >= 0
      ? lerp(clampedCenterAnchor, behindLimit, signedRatio)
      : lerp(clampedCenterAnchor, forwardLimit, -signedRatio)

  const orientedClamped = Math.min(
    Math.max(oriented, Math.min(orientedMin, orientedMax)),
    Math.max(orientedMin, orientedMax)
  )
  return clampDmxFloatValue(
    unorientDmxValue(orientedClamped, min, max, calibration.invert),
    min
  )
}

function getMoverBoundValue(
  bounds: MoverBounds,
  corner: keyof MoverBounds,
  axis: 'pan' | 'tilt',
  fallback: number
): number {
  const rawValue = Number(bounds[corner][axis])
  return clampDmxValue(rawValue, fallback)
}

function mapPointToBounds(
  bounds: MoverBounds | undefined,
  x: number,
  y: number
): { panDmx: number; tiltDmx: number } | undefined {
  if (bounds === undefined) {
    return undefined
  }

  const nx = clampNormalized(x)
  const ny = clampNormalized(y)

  const topPan = lerp(
    getMoverBoundValue(bounds, 'topLeft', 'pan', 0),
    getMoverBoundValue(bounds, 'topRight', 'pan', DMX_MAX_VALUE),
    nx
  )
  const bottomPan = lerp(
    getMoverBoundValue(bounds, 'bottomLeft', 'pan', 0),
    getMoverBoundValue(bounds, 'bottomRight', 'pan', DMX_MAX_VALUE),
    nx
  )

  const topTilt = lerp(
    getMoverBoundValue(bounds, 'topLeft', 'tilt', DMX_MAX_VALUE),
    getMoverBoundValue(bounds, 'topRight', 'tilt', DMX_MAX_VALUE),
    nx
  )
  const bottomTilt = lerp(
    getMoverBoundValue(bounds, 'bottomLeft', 'tilt', 0),
    getMoverBoundValue(bounds, 'bottomRight', 'tilt', 0),
    nx
  )

  return {
    panDmx: clampDmxFloatValue(lerp(topPan, bottomPan, ny)),
    tiltDmx: clampDmxFloatValue(lerp(topTilt, bottomTilt, ny)),
  }
}

function isLikelyUncalibratedMoverBounds(bounds: MoverBounds | undefined): boolean {
  if (bounds === undefined) {
    return true
  }

  const tolerance = 1.5
  const closeTo = (value: number, target: number) =>
    Math.abs(clampDmxFloatValue(value) - target) <= tolerance

  const looksLikeDefault =
    closeTo(bounds.topLeft.pan, DMX_MIN_VALUE) &&
    closeTo(bounds.topLeft.tilt, DMX_MAX_VALUE) &&
    closeTo(bounds.topRight.pan, DMX_MAX_VALUE) &&
    closeTo(bounds.topRight.tilt, DMX_MAX_VALUE) &&
    closeTo(bounds.bottomLeft.pan, DMX_MIN_VALUE) &&
    closeTo(bounds.bottomLeft.tilt, DMX_MIN_VALUE) &&
    closeTo(bounds.bottomRight.pan, DMX_MAX_VALUE) &&
    closeTo(bounds.bottomRight.tilt, DMX_MIN_VALUE)

  return looksLikeDefault
}

/**
 * Fallback pan/tilt when floor bounds calibration is missing: movers use their
 * own target space; fixture X/Y plus a shared default Z (when window.z absent)
 * drive triangulation. Not tied to the fixture editor "Enable Z Depth" UI flag.
 */
function mapPointToFixturePlacementFallback(
  fixture: FlattenedFixture,
  x: number,
  y: number
): { panNorm: number; tiltNorm: number } {
  const fixtureX = clampNormalized(fixture.window?.x?.pos ?? 0.5)
  const fixtureY = clampNormalized(fixture.window?.y?.pos ?? 0.5)
  const fixtureZ = clampNormalized(fixture.window?.z?.pos ?? 0.75)

  const dx = x - fixtureX
  const dy = y - fixtureY

  // Approximate source-to-target floor triangulation from fixture placement:
  // pan comes from heading around the source point,
  // tilt comes from the down-angle toward floor distance and whether target is
  // in front/behind the fixture.
  const panAngle = Math.atan2(dx, dy)
  const panNorm = clampNormalized(0.5 + panAngle / (Math.PI * 2))

  const horizontalDist = Math.max(0.0001, Math.hypot(dx, dy))
  const downAngle = Math.atan2(Math.max(0.001, fixtureZ), horizontalDist)
  const tiltMagnitude = clampNormalized(downAngle / (Math.PI / 2))
  const isBehindFixture = dy < 0
  const tiltNorm = clampNormalized(
    0.5 + (isBehindFixture ? 1 : -1) * tiltMagnitude * 0.5
  )

  return { panNorm, tiltNorm }
}

function clampAxisToCalibrationRange(
  value: number,
  calibration?: { min: number; max: number }
): number {
  const safe = clampDmxFloatValue(value)
  if (calibration === undefined) {
    return safe
  }
  const min = clampDmxValue(calibration.min, DMX_MIN_VALUE)
  const max = clampDmxValue(calibration.max, DMX_MAX_VALUE)
  const low = Math.min(min, max)
  const high = Math.max(min, max)
  return Math.min(high, Math.max(low, safe))
}

function mapMoverPointToFixtureAxisTarget(
  fixture: FlattenedFixture,
  x: number,
  y: number,
  useFloorBoundsLock: boolean,
  plannerKey: string | undefined,
  timeState: TimeState,
  options?: {
    useHomeCenteredBasicAim?: boolean
  }
): MoverAxisOverrides {
  const normalizedX = clampNormalized(x)
  const normalizedY = clampNormalized(y)
  const useHomeCenteredBasicAim = options?.useHomeCenteredBasicAim === true

  if (!useFloorBoundsLock) {
    const targetPanDmx = useHomeCenteredBasicAim
      ? mapPanNormalizedToDmx(
          normalizedX,
          fixture.moverCalibration?.pan,
          plannerKey,
          undefined,
          { centerAnchor: 'home' }
        )
      : mapNormalizedToAxisPhysicalDmx(
          normalizedX,
          fixture.moverCalibration?.pan
        )
    const targetTiltDmx = mapTiltNormalizedToDmx(
      normalizedY,
      fixture.moverMountOrientation === 'inverted' ? 'inverted' : 'upright',
      fixture.moverCalibration?.tilt,
      useHomeCenteredBasicAim ? { centerAnchor: 'home' } : undefined
    )

    return resolveMoverAxisTargetWithPathing(
      clampAxisToCalibrationRange(targetPanDmx, fixture.moverCalibration?.pan),
      clampAxisToCalibrationRange(targetTiltDmx, fixture.moverCalibration?.tilt),
      undefined,
      timeState
    )
  }

  const usableBounds = !isLikelyUncalibratedMoverBounds(fixture.moverBounds)
    ? fixture.moverBounds
    : undefined
  const mappedBounds = mapPointToBounds(usableBounds, normalizedX, normalizedY)
  const fallbackPlacementTarget =
    mappedBounds === undefined
      ? mapPointToFixturePlacementFallback(fixture, normalizedX, normalizedY)
      : undefined

  const targetPanDmx =
    mappedBounds?.panDmx ??
    mapPanNormalizedToDmx(
      fallbackPlacementTarget?.panNorm ?? normalizedX,
      fixture.moverCalibration?.pan,
      plannerKey,
      SPLIT_PAN_RANGE_DEG
    )
  const targetTiltDmx =
    mappedBounds?.tiltDmx ??
    mapTiltNormalizedToDmx(
      fallbackPlacementTarget?.tiltNorm ?? normalizedY,
      fixture.moverMountOrientation === 'inverted' ? 'inverted' : 'upright',
      fixture.moverCalibration?.tilt
    )

  return resolveMoverAxisTargetWithPathing(
    clampAxisToCalibrationRange(targetPanDmx, fixture.moverCalibration?.pan),
    clampAxisToCalibrationRange(targetTiltDmx, fixture.moverCalibration?.tilt),
    plannerKey,
    timeState
  )
}

function mapMoverHomeToFixtureAxisTarget(
  fixture: FlattenedFixture,
  plannerKey: string | undefined,
  timeState: TimeState
): MoverAxisOverrides {
  const panHome = Number(fixture.moverCalibration?.pan?.home)
  const tiltHome = Number(fixture.moverCalibration?.tilt?.home)

  const targetPanDmx = Number.isFinite(panHome)
    ? clampAxisToCalibrationRange(panHome, fixture.moverCalibration?.pan)
    : mapPanNormalizedToDmx(
        0.5,
        fixture.moverCalibration?.pan,
        plannerKey,
        SPLIT_PAN_RANGE_DEG
      )
  const targetTiltDmx = Number.isFinite(tiltHome)
    ? clampAxisToCalibrationRange(tiltHome, fixture.moverCalibration?.tilt)
    : mapTiltNormalizedToDmx(
        0.5,
        fixture.moverMountOrientation === 'inverted' ? 'inverted' : 'upright',
        fixture.moverCalibration?.tilt
      )

  return resolveMoverAxisTargetWithPathing(
    clampAxisToCalibrationRange(targetPanDmx, fixture.moverCalibration?.pan),
    clampAxisToCalibrationRange(targetTiltDmx, fixture.moverCalibration?.tilt),
    plannerKey,
    timeState
  )
}

function resolveMoverAxisTargetWithPathing(
  targetPanDmx: number,
  targetTiltDmx: number,
  plannerKey: string | undefined,
  timeState: TimeState
): MoverAxisOverrides {

  if (plannerKey === undefined || plannerKey.length <= 0) {
    return {
      panDmx: clampDmxFloatValue(targetPanDmx),
      tiltDmx: clampDmxFloatValue(targetTiltDmx),
      panFineEnabled: true,
      tiltFineEnabled: true,
    }
  }

  const nowMs = Date.now()
  cleanupMoverPathState(nowMs)
  const frameDtSec = resolveMoverPathDtSeconds(timeState)

  const existingState = _moverPathStateByFixtureKey.get(plannerKey)
  const currentState = existingState ?? {
    panDmx: clampDmxFloatValue(targetPanDmx),
    tiltDmx: clampDmxFloatValue(targetTiltDmx),
    panTargetDmx: clampDmxFloatValue(targetPanDmx),
    tiltTargetDmx: clampDmxFloatValue(targetTiltDmx),
    panVelocityDmxPerSec: 0,
    tiltVelocityDmxPerSec: 0,
    panFineEnabled: false,
    tiltFineEnabled: false,
    lastSeenMs: nowMs,
  }
  const elapsedSec =
    existingState === undefined
      ? frameDtSec
      : Math.min(
          MOVER_PATH_MAX_DT_SEC,
          Math.max(0, (nowMs - existingState.lastSeenMs) / 1000)
        )
  const dtSec = elapsedSec

  const rawPanTarget = clampDmxFloatValue(targetPanDmx)
  const rawTiltTarget = clampDmxFloatValue(targetTiltDmx)
  const stablePanTarget =
    Math.abs(rawPanTarget - currentState.panTargetDmx) <=
    MOVER_PATH_TARGET_DEADBAND_DMX
      ? currentState.panTargetDmx
      : rawPanTarget
  const stableTiltTarget =
    Math.abs(rawTiltTarget - currentState.tiltTargetDmx) <=
    MOVER_PATH_TARGET_DEADBAND_DMX
      ? currentState.tiltTargetDmx
      : rawTiltTarget

  const nextPan = stepPathAxisValue(
    currentState.panDmx,
    currentState.panVelocityDmxPerSec,
    stablePanTarget,
    dtSec,
    MOVER_PATH_MAX_PAN_DMX_PER_SEC,
    MOVER_PATH_MAX_PAN_ACCEL_DMX_PER_SEC2,
    DMX_MIN_VALUE,
    DMX_MAX_VALUE
  )
  const nextTilt = stepPathAxisValue(
    currentState.tiltDmx,
    currentState.tiltVelocityDmxPerSec,
    stableTiltTarget,
    dtSec,
    MOVER_PATH_MAX_TILT_DMX_PER_SEC,
    MOVER_PATH_MAX_TILT_ACCEL_DMX_PER_SEC2,
    DMX_MIN_VALUE,
    DMX_MAX_VALUE
  )

  const settledPan =
    Math.abs(nextPan.value - stablePanTarget) <= MOVER_PATH_SETTLE_DISTANCE_DMX &&
    Math.abs(nextPan.velocity) <= MOVER_PATH_SETTLE_VELOCITY_DMX_PER_SEC
      ? { value: stablePanTarget, velocity: 0 }
      : nextPan
  const settledTilt =
    Math.abs(nextTilt.value - stableTiltTarget) <= MOVER_PATH_SETTLE_DISTANCE_DMX &&
    Math.abs(nextTilt.velocity) <= MOVER_PATH_SETTLE_VELOCITY_DMX_PER_SEC
      ? { value: stableTiltTarget, velocity: 0 }
      : nextTilt

  // Keep planner continuous. Integer snap at rest can cause visible stair-stepping
  // during slow/manual XY pad movement.
  const holdPanAtRest =
    Math.abs(settledPan.value - stablePanTarget) <= MOVER_PATH_IDLE_HOLD_DISTANCE_DMX &&
    Math.abs(settledPan.velocity) <= MOVER_PATH_IDLE_HOLD_VELOCITY_DMX_PER_SEC
  const holdTiltAtRest =
    Math.abs(settledTilt.value - stableTiltTarget) <= MOVER_PATH_IDLE_HOLD_DISTANCE_DMX &&
    Math.abs(settledTilt.velocity) <= MOVER_PATH_IDLE_HOLD_VELOCITY_DMX_PER_SEC

  const finalPanTarget = stablePanTarget
  const finalTiltTarget = stableTiltTarget

  const finalPan = holdPanAtRest
    ? { value: stablePanTarget, velocity: 0 }
    : settledPan
  const finalTilt = holdTiltAtRest
    ? { value: stableTiltTarget, velocity: 0 }
    : settledTilt

  const priorPanFineEnabled = existingState?.panFineEnabled === true
  const priorTiltFineEnabled = existingState?.tiltFineEnabled === true

  const panDistance = Math.abs(finalPan.value - finalPanTarget)
  const panSpeed = Math.abs(finalPan.velocity)
  const tiltDistance = Math.abs(finalTilt.value - finalTiltTarget)
  const tiltSpeed = Math.abs(finalTilt.velocity)

  const panFineEnableCandidate =
    panDistance <= MOVER_FINE_ENABLE_DISTANCE_DMX &&
    panSpeed <= MOVER_FINE_ENABLE_VELOCITY_DMX_PER_SEC
  const tiltFineEnableCandidate =
    tiltDistance <= MOVER_FINE_ENABLE_DISTANCE_DMX &&
    tiltSpeed <= MOVER_FINE_ENABLE_VELOCITY_DMX_PER_SEC
  const panFineDisableCandidate =
    panDistance >= MOVER_FINE_DISABLE_DISTANCE_DMX ||
    panSpeed >= MOVER_FINE_DISABLE_VELOCITY_DMX_PER_SEC
  const tiltFineDisableCandidate =
    tiltDistance >= MOVER_FINE_DISABLE_DISTANCE_DMX ||
    tiltSpeed >= MOVER_FINE_DISABLE_VELOCITY_DMX_PER_SEC

  const panFineEnabled = priorPanFineEnabled
    ? !panFineDisableCandidate
    : panFineEnableCandidate
  const tiltFineEnabled = priorTiltFineEnabled
    ? !tiltFineDisableCandidate
    : tiltFineEnableCandidate

  _moverPathStateByFixtureKey.set(plannerKey, {
    panDmx: finalPan.value,
    tiltDmx: finalTilt.value,
    panTargetDmx: finalPanTarget,
    tiltTargetDmx: finalTiltTarget,
    panVelocityDmxPerSec: finalPan.velocity,
    tiltVelocityDmxPerSec: finalTilt.velocity,
    panFineEnabled,
    tiltFineEnabled,
    lastSeenMs: nowMs,
  })

  return {
    panDmx: finalPan.value,
    tiltDmx: finalTilt.value,
    panFineEnabled,
    tiltFineEnabled,
  }
}

function mirrorAroundCenter(value: number, center: number): number {
  return center * 2 - value
}

function buildMoverAxisOverridesForSplit(
  splitSceneFixtures: FlattenedFixture[],
  baseParams: SplitState['outputParams'],
  outputParams: SplitState['outputParams'],
  timeState: TimeState,
  plannerNamespace: string,
  override?: {
    enabled: boolean
    pan: number
    tilt: number
    groupNames?: string[]
  },
  options?: {
    advancedControl?: boolean
  }
): { [fixtureIdx: number]: MoverAxisOverrides } {
  const axisOverridesByFixtureIdx: { [fixtureIdx: number]: MoverAxisOverrides } = {}
  const resolvedAxisParams = {
    ...baseParams,
    ...outputParams,
  }
  const advancedControl = options?.advancedControl === true

  if (!advancedControl) {
    const baseX = clampNormalized(Number(resolvedAxisParams.xAxis ?? 0.5))
    const baseY = clampNormalized(Number(resolvedAxisParams.yAxis ?? 0.5))

    splitSceneFixtures.forEach((fixture, fixtureIdx) => {
      if (!hasMoverAxisChannels(fixture)) {
        return
      }

      const plannerKey = getMoverPlannerKey(fixture, plannerNamespace)
      axisOverridesByFixtureIdx[fixtureIdx] = mapMoverPointToFixtureAxisTarget(
        fixture,
        baseX,
        baseY,
        false,
        plannerKey,
        timeState,
        { useHomeCenteredBasicAim: true }
      )
    })

    return axisOverridesByFixtureIdx
  }

  const overrideEnabled = override?.enabled === true
  const overrideX = clampNormalized(Number(override?.pan ?? 0.5))
  const overrideY = clampNormalized(Number(override?.tilt ?? 0.5))
  const overrideGroupSet =
    overrideEnabled && Array.isArray(override?.groupNames) && override.groupNames.length > 0
      ? new Set(
          override.groupNames
            .map((name) => name.trim())
            .filter((name) => name.length > 0)
        )
      : null
  const spread = Math.min(
    MOVER_TANDEM_MAX_SPREAD,
    clampNormalized(getParam(resolvedAxisParams, 'moverSpread'))
  )
  const floorBoundsLocked = getParam(resolvedAxisParams, 'moverFloorLock') > 0.5
  const mirrorLeftRight = getParam(resolvedAxisParams, 'moverMirrorX') > 0.5
  const mirrorTopBottom = getParam(resolvedAxisParams, 'moverMirrorY') > 0.5
  const moverModeRaw = Number(resolvedAxisParams.moverMode ?? 0)
  const baseMoverMode = Number.isFinite(moverModeRaw)
    ? Math.max(0, Math.min(2, Math.round(moverModeRaw)))
    : 0

  const fixturesByGroup: {
    [groupName: string]: Array<{
      fixtureIdx: number
      fixture: FlattenedFixture
      x: number
      y: number
    }>
  } = {}

  splitSceneFixtures.forEach((fixture, fixtureIdx) => {
    const groupName = fixture.moverGroup?.trim()
    if (!groupName || !hasMoverAxisChannels(fixture)) {
      return
    }

    const center = fixtureCenterPosition(fixture)
    const groupItems = fixturesByGroup[groupName] ?? []
    groupItems.push({
      fixtureIdx,
      fixture,
      x: center.x,
      y: center.y,
    })
    fixturesByGroup[groupName] = groupItems
  })

  for (const [groupName, fixturesInGroup] of Object.entries(fixturesByGroup)) {
    const normalizedGroupName = groupName.trim()
    const groupOverrideEnabled =
      overrideEnabled &&
      (overrideGroupSet === null || overrideGroupSet.has(normalizedGroupName))
    const hasPanTarget =
      groupOverrideEnabled || Number.isFinite(resolvedAxisParams.xAxis)
    const hasTiltTarget =
      groupOverrideEnabled || Number.isFinite(resolvedAxisParams.yAxis)
    const baseX = groupOverrideEnabled
      ? overrideX
      : hasPanTarget
        ? clampNormalized(Number(resolvedAxisParams.xAxis))
        : 0.5
    const baseY = groupOverrideEnabled
      ? overrideY
      : hasTiltTarget
        ? clampNormalized(Number(resolvedAxisParams.yAxis))
        : 0.5
    const moverMode = groupOverrideEnabled ? 0 : baseMoverMode
    const useMirrorLeftRight = !groupOverrideEnabled && mirrorLeftRight
    const useMirrorTopBottom = !groupOverrideEnabled && mirrorTopBottom

    const orderedFixtures = [...fixturesInGroup].sort((left, right) => {
      if (left.x !== right.x) return left.x - right.x
      if (left.y !== right.y) return left.y - right.y
      return left.fixtureIdx - right.fixtureIdx
    })

    let minX = 1
    let maxX = 0
    let minY = 1
    let maxY = 0

    for (const entry of orderedFixtures) {
      minX = Math.min(minX, entry.x)
      maxX = Math.max(maxX, entry.x)
      minY = Math.min(minY, entry.y)
      maxY = Math.max(maxY, entry.y)
    }

    const spanX = maxX - minX
    const spanY = maxY - minY
    const hasHorizontalSpread = spanX > 0.0001
    const hasVerticalSpread = spanY > 0.0001

    const centerX = (minX + maxX) * 0.5
    const centerY = (minY + maxY) * 0.5
    const sideEpsilon = 0.0001
    const isRightFlags = orderedFixtures.map((entry, entryIndex) =>
      hasHorizontalSpread
        ? entry.x > centerX + sideEpsilon
        : entryIndex >= Math.ceil(orderedFixtures.length / 2)
    )
    const isBottomFlags = orderedFixtures.map((entry) =>
      hasVerticalSpread ? entry.y < centerY - sideEpsilon : false
    )

    orderedFixtures.forEach((entry, entryIndex) => {
      const plannerKey = getMoverPlannerKey(entry.fixture, plannerNamespace)

      if (!hasPanTarget && !hasTiltTarget) {
        axisOverridesByFixtureIdx[entry.fixtureIdx] = mapMoverHomeToFixtureAxisTarget(
          entry.fixture,
          plannerKey,
          timeState
        )
        return
      }

      const relX = hasHorizontalSpread
        ? clampNormalized((entry.x - minX) / spanX)
        : orderedFixtures.length <= 1
          ? 0.5
          : entryIndex / (orderedFixtures.length - 1)

      const isRight = isRightFlags[entryIndex] === true
      const isBottom = isBottomFlags[entryIndex] === true

      let fixtureX = hasPanTarget ? baseX : 0.5
      let fixtureY = hasTiltTarget ? baseY : 0.5

      if (moverMode === 1 && hasPanTarget) {
        // Tandem pattern spreads movers horizontally only.
        fixtureX = baseX + (relX - 0.5) * spread
      }

      const applyPatternMirrorX = moverMode === 2 && useMirrorLeftRight
      const applyGroupMirrorX = hasPanTarget && applyPatternMirrorX
      const applyGroupMirrorY = hasTiltTarget && moverMode === 2 && useMirrorTopBottom

      // Mirror in target-space relative to the group's center.
      // Left/top fixtures remain the reference; right/bottom fixtures mirror
      // by reflecting the reference side's look-direction in world-space.
      if (applyGroupMirrorX && isRight) {
        // Mirror around pad center for symmetric target-space motion.
        fixtureX = mirrorAroundCenter(fixtureX, 0.5)
      }
      if (applyGroupMirrorY && isBottom) {
        // Mirror around pad center for symmetric target-space motion.
        fixtureY = mirrorAroundCenter(fixtureY, 0.5)
      }

      axisOverridesByFixtureIdx[entry.fixtureIdx] = mapMoverPointToFixtureAxisTarget(
        entry.fixture,
        clampNormalized(hasPanTarget ? fixtureX : baseX),
        clampNormalized(hasTiltTarget ? fixtureY : baseY),
        floorBoundsLocked,
        plannerKey,
        timeState
      )
    })
  }

  return axisOverridesByFixtureIdx
}

function getMoverCalibrationOverrideTarget(
  state: CleanReduxState,
  fixtureId: string | undefined
): { panDmx: number; tiltDmx: number } | undefined {
  if (fixtureId === undefined) {
    return undefined
  }

  const override = state.gui.moverCalibrationOverride
  if (override === null || override.fixtureId !== fixtureId) {
    return undefined
  }

  return {
    panDmx: override.panDmx,
    tiltDmx: override.tiltDmx,
  }
}

function getMapCalibrationOverrideForChannel(
  state: CleanReduxState,
  fixture: FlattenedFixture,
  channel: FixtureChannel
): number | undefined {
  const fixtureType = state.dmx.fixtureTypesByID[fixture.fixtureTypeId ?? '']
  return getFixtureMapCalibrationOverrideValue(
    fixture.fixtureTypeId,
    fixtureType?.channels,
    channel,
    [
      {
        override: state.gui.colorMapCalibrationOverride,
        predicate: fixtureChannelHasColorMap,
      },
      {
        override: state.gui.goboMapCalibrationOverride,
        predicate: fixtureChannelHasGoboMap,
      },
      {
        override: state.gui.prismMapCalibrationOverride,
        predicate: fixtureChannelHasPrismMap,
      },
    ]
  )
}

function calculateDmxForUniverse(
  state: CleanReduxState,
  splitStates: SplitState[],
  timeState: TimeState,
  universeIndex: number
): number[] {
  const universeFixtures = state.dmx.universe.filter(
    (fixture) => (fixture.universe ?? 1) === universeIndex
  )
  const all_fixtures = flatten_fixtures(
    universeFixtures,
    state.dmx.fixtureTypesByID,
    state.dmx.moverGroupByFixtureId
  )
  const universeHasMoverFixtureType = universeHasMovers(
    universeFixtures,
    state.dmx.fixtureTypesByID
  )

  // All channels start at 0
  const channels = Array(DMX_NUM_CHANNELS).fill(0)

  const moverCalibrationOverride = state.gui.moverCalibrationOverride
  const colorMapCalibrationOverride = state.gui.colorMapCalibrationOverride
  const goboMapCalibrationOverride = state.gui.goboMapCalibrationOverride
  const prismMapCalibrationOverride = state.gui.prismMapCalibrationOverride
  const fixtureMapCalibrationActive =
    colorMapCalibrationOverride !== null ||
    goboMapCalibrationOverride !== null ||
    prismMapCalibrationOverride !== null
  const axisOnlyOverrideMode =
    !timeState.isPlaying &&
    state.gui.moverAdvancedControlEnabled === true &&
    moverCalibrationOverride !== null &&
    !fixtureMapCalibrationActive
  const fixtureMapOnlyOverrideMode = fixtureMapCalibrationActive

  const syntheticStrobeFrameRateHz = getSyntheticStrobeFrameRateHz(state)
  const placementDepth2DOnly = state.gui.fxtrDepthOn !== true

  // Set each channel to its default value first.
  forEachChannel(all_fixtures, (_fixtureIdx, _fixture, channelIdx, channel) => {
    writeDmxChannel(channels, channelIdx, getDefaultDmxValue(channel))
  })

  if (axisOnlyOverrideMode && moverCalibrationOverride !== null) {
    forEachChannel(all_fixtures, (_fixtureIdx, fixture, channelIdx, channel) => {
      if (channel.type !== 'axis') return
      if (fixture.fixtureId !== moverCalibrationOverride.fixtureId) return

      const overrideDmx =
        channel.dir === 'x'
          ? moverCalibrationOverride.panDmx
          : moverCalibrationOverride.tiltDmx

      if (channel.isFine) {
        writeDmxChannel(channels, channelIdx, channel.min)
        return
      }

      writeDmxChannel(channels, channelIdx, clampDmxValue(overrideDmx, channel.min))
    })
  } else if (fixtureMapOnlyOverrideMode) {
    // Fixture-manager wheel tuning overrides scene output on matching fixtures.
    const activeOverride =
      colorMapCalibrationOverride ??
      goboMapCalibrationOverride ??
      prismMapCalibrationOverride
    const matchingFixtureTypeId = activeOverride?.fixtureTypeId

    forEachChannel(all_fixtures, (_fixtureIdx, fixture, channelIdx, channel) => {
      if (
        matchingFixtureTypeId !== undefined &&
        fixture.fixtureTypeId === matchingFixtureTypeId &&
        channel.type === 'master'
      ) {
        writeDmxChannel(channels, channelIdx, channel.max)
      }

      const mapOverrideValue = getMapCalibrationOverrideForChannel(
        state,
        fixture,
        channel
      )
      if (mapOverrideValue !== undefined) {
        writeDmxChannel(channels, channelIdx, mapOverrideValue)
      }
    })
  } else {
    const scenes = state.control.light
    const activeScene = scenes.byId[scenes.active]
    const plannerNamespace = `u${universeIndex}`

    if (activeScene?.splitScenes) {
      for (const [{ outputParams, randomizer }, splitScene] of zip(
        splitStates,
        activeScene.splitScenes
      )) {
      const splitGroups = splitScene.groups
      const splitHasAxisBundle =
        splitScene.baseParams.xAxis !== undefined ||
        splitScene.baseParams.yAxis !== undefined ||
        splitScene.baseParams.moverFloorLock !== undefined ||
        splitScene.baseParams.moverSpread !== undefined ||
        splitScene.baseParams.moverMirrorX !== undefined ||
        splitScene.baseParams.moverMirrorY !== undefined ||
        splitScene.baseParams.moverMode !== undefined ||
        outputParams.moverFloorLock !== undefined ||
        outputParams.xAxis !== undefined ||
        outputParams.yAxis !== undefined
      const splitHasAtmosControlBundle =
        splitScene.baseParams.atmosFxtrOnOff !== undefined ||
        splitScene.baseParams.atmosFxtrLevel !== undefined ||
        outputParams.atmosFxtrOnOff !== undefined ||
        outputParams.atmosFxtrLevel !== undefined
      const splitHasLightingControls = splitHasLightingControlBundle(
        splitScene.baseParams
      )

      const splitSceneFixtures = getFixturesInGroups(all_fixtures, splitGroups)
      const followOverrideGroupNames =
        state.gui.moverFollowOverrideUseAllGroups === true
          ? undefined
          : state.gui.moverFollowOverrideGroups
      const splitMoverAxisOverrides =
        splitHasAxisBundle && universeHasMoverFixtureType
          ? buildMoverAxisOverridesForSplit(
              splitSceneFixtures,
              splitScene.baseParams,
              outputParams,
              timeState,
              plannerNamespace,
              {
                enabled:
                  state.gui.moverAdvancedControlEnabled === true &&
                  state.gui.moverFollowOverrideEnabled === true,
                pan: state.gui.moverFollowOverridePan,
                tilt: state.gui.moverFollowOverrideTilt,
                groupNames: followOverrideGroupNames,
              },
              {
                advancedControl: state.gui.moverAdvancedControlEnabled === true,
              }
            )
          : {}

      const stageLightGrid = getLatestStageLightMap()
      const visualScenes = state.control.visual
      const activeVisualScene = visualScenes.byId[visualScenes.active]
      const vizDriverParams = getVisualizerDriverOutputParams(
        activeScene,
        splitStates
      )
      const stageMapMaster =
        activeVisualScene !== undefined
          ? stageLightMapMasterFromEffects(
              activeVisualScene.config.builtin.effects,
              vizDriverParams
            )
          : 0
      const stageMapMix = getParam(outputParams, 'visStageMapMix') * stageMapMaster
      const stageCrop2d = getMovingWindow(outputParams, placementDepth2DOnly)
      const stageLightFixtureParams =
        stageLightGrid !== null && stageMapMix > 0.001
          ? new Map<number, Params>()
          : null

      // Set each channel based on active scene fixtures.
      forEachChannel(
        splitSceneFixtures,
        (fixtureIdx, fixture, channelIdx, channel) => {
          if (channel.type === 'axis' && !splitHasAxisBundle) {
            return
          }
          if (channel.type !== 'axis' && !splitHasLightingControls) {
            const allowAtmosChannel =
              splitHasAtmosControlBundle && isAtmosControlChannel(channel)
            if (!allowAtmosChannel) {
              return
            }
          }

          const randomizerLevel = randomizer[fixtureIdx]?.level ?? 1
          const moverAxisOverride =
            channel.type === 'axis'
              ? splitMoverAxisOverrides[fixtureIdx]
              : undefined

          const calibrationOverride =
            channel.type === 'axis'
              ? getMoverCalibrationOverrideTarget(state, fixture.fixtureId)
              : undefined
          const mapOverrideValue = getMapCalibrationOverrideForChannel(
            state,
            fixture,
            channel
          )

          let dmxParams = outputParams
          if (stageLightFixtureParams !== null && stageLightGrid !== null) {
            let merged = stageLightFixtureParams.get(fixtureIdx)
            if (merged === undefined) {
              merged = mergeParamsWithStageLightSample(
                outputParams,
                fixture,
                stageLightGrid,
                stageMapMix,
                stageCrop2d
              )
              stageLightFixtureParams.set(fixtureIdx, merged)
            }
            dmxParams = merged
          }

          let axisOverrides: MoverAxisOverrides | undefined = moverAxisOverride

          if (calibrationOverride !== undefined) {
            axisOverrides = {
              panDmx: calibrationOverride.panDmx,
              tiltDmx: calibrationOverride.tiltDmx,
              panFineEnabled: true,
              tiltFineEnabled: true,
            }
          }

          const nextValue =
            channel.type === 'axis' && calibrationOverride !== undefined
              ? channel.isFine
                ? channel.min
                : clampDmxValue(
                    channel.dir === 'x'
                      ? calibrationOverride.panDmx
                      : calibrationOverride.tiltDmx,
                    channel.min
                  )
              : mapOverrideValue !== undefined
                ? mapOverrideValue
                : getDmxValue(
                    channel,
                    dmxParams,
                    fixture,
                    state.control.master,
                    randomizerLevel,
                    timeState,
                    syntheticStrobeFrameRateHz,
                    axisOverrides,
                    placementDepth2DOnly
                  )

          if (channel.type === 'axis') {
            // Axis channels should use the exact computed DMX value.
            writeDmxChannel(channels, channelIdx, nextValue)
          } else {
            writeDmxChannel(
              channels,
              channelIdx,
              Math.max(readDmxChannel(channels, channelIdx), nextValue)
            )
          }
        }
      )
    }
    }
  }

  // Apply any overwrites last.
  const overwrites = getUniverseOverwrites(state.mixer, universeIndex)
  indexArray(DMX_NUM_CHANNELS).forEach((i) => {
    const overwrite = overwrites[i]
    if (overwrite !== undefined) {
      channels[i] = overwrite * DMX_MAX_VALUE
    }
  })

  zeroUnpatchedDmxChannels(
    universeFixtures,
    state.dmx.fixtureTypesByID,
    channels
  )

  return normalizeDmxUniverseChannels(channels)
}

function zeroAllDmxUniverseBuffers(
  state: CleanReduxState,
  dmxOutByUniverse: number[][]
): void {
  for (let index = 0; index < dmxOutByUniverse.length; index++) {
    dmxOutByUniverse[index] = Array(DMX_NUM_CHANNELS).fill(0)
  }

  const universeCount = getUniverseCount(state)
  for (let universeIndex = 1; universeIndex <= universeCount; universeIndex++) {
    const idx = universeIndex - 1
    while (dmxOutByUniverse.length <= idx) {
      dmxOutByUniverse.push(Array(DMX_NUM_CHANNELS).fill(0))
    }
    dmxOutByUniverse[idx] = Array(DMX_NUM_CHANNELS).fill(0)
  }
}

/** Keep unpatched addresses at 0 after any post-process (e.g. atmospherics) mutates universe buffers. */
export function finalizeDmxUniverses(
  state: CleanReduxState,
  dmxOutByUniverse: number[][]
): void {
  if (state.gui.blackout === true) {
    zeroAllDmxUniverseBuffers(state, dmxOutByUniverse)
    return
  }

  const universeCount = getUniverseCount(state)
  const types = state.dmx.fixtureTypesByID

  for (let universeIndex = 1; universeIndex <= universeCount; universeIndex++) {
    const idx = universeIndex - 1
    while (dmxOutByUniverse.length <= idx) {
      dmxOutByUniverse.push(Array(DMX_NUM_CHANNELS).fill(0))
    }

    const universeFixtures = state.dmx.universe.filter(
      (fixture) => (fixture.universe ?? 1) === universeIndex
    )
    const normalized = normalizeDmxUniverseChannels(
      dmxOutByUniverse[idx] ?? Array(DMX_NUM_CHANNELS).fill(0)
    )
    zeroUnpatchedDmxChannels(universeFixtures, types, normalized)
    dmxOutByUniverse[idx] = normalized
  }
}

export function calculateDmx(
  state: CleanReduxState,
  splitStates: SplitState[],
  timeState: TimeState
): number[][] {
  const universeCount = getUniverseCount(state)
  const outputByUniverse: number[][] = []

  for (let universeIndex = 1; universeIndex <= universeCount; universeIndex++) {
    outputByUniverse.push(
      calculateDmxForUniverse(state, splitStates, timeState, universeIndex)
    )
  }

  return outputByUniverse
}

