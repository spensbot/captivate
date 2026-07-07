import {
  DMX_MAX_VALUE,
  DMX_MIN_VALUE,
  DMX_NUM_CHANNELS,
  FlattenedFixture,
  normalizeDmxUniverseChannels,
  universeHasMovers,
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
import { clampNormalized } from '../../math/util'
import { getParam, type Params } from '../../shared/params'
import {
  MOVER_TANDEM_MAX_SPREAD,
  parseMoverModeFromParams,
  resolveMoverPadTargetsForGroup,
} from '../../shared/moverPadTargets'
import {
  getVisualizerDriverOutputParams,
  mergeParamsWithStageLightSample,
  stageLightMapMasterFromEffects,
} from '../../shared/stageLightMap'
import { getLatestStageLightMap } from './stageLightMapRuntime'

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
  plannerKey: string | undefined,
  timeState: TimeState
): MoverAxisOverrides {
  const normalizedX = clampNormalized(x)
  const normalizedY = clampNormalized(y)

  const targetPanDmx = mapNormalizedToAxisPhysicalDmx(
    normalizedX,
    fixture.moverCalibration?.pan
  )
  const targetTiltDmx = mapNormalizedToAxisPhysicalDmx(
    normalizedY,
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
    : mapNormalizedToAxisPhysicalDmx(0.5, fixture.moverCalibration?.pan)
  const targetTiltDmx = Number.isFinite(tiltHome)
    ? clampAxisToCalibrationRange(tiltHome, fixture.moverCalibration?.tilt)
    : mapNormalizedToAxisPhysicalDmx(0.5, fixture.moverCalibration?.tilt)

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
        plannerKey,
        timeState
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
  const mirrorLeftRight = getParam(resolvedAxisParams, 'moverMirrorX') > 0.5
  const mirrorTopBottom = getParam(resolvedAxisParams, 'moverMirrorY') > 0.5
  const baseMoverMode = parseMoverModeFromParams(resolvedAxisParams)

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

    const padTargets = resolveMoverPadTargetsForGroup(
      orderedFixtures.map((entry) => ({
        key: String(entry.fixtureIdx),
        x: entry.x,
        y: entry.y,
        sortOrder: entry.fixtureIdx,
      })),
      {
        baseX,
        baseY,
        moverMode,
        spread,
        mirrorLeftRight: useMirrorLeftRight,
        mirrorTopBottom: useMirrorTopBottom,
        hasPanTarget,
        hasTiltTarget,
      }
    )

    padTargets.forEach((padTarget, entryIndex) => {
      const entry = orderedFixtures[entryIndex]
      const plannerKey = getMoverPlannerKey(entry.fixture, plannerNamespace)

      if (!hasPanTarget && !hasTiltTarget) {
        axisOverridesByFixtureIdx[entry.fixtureIdx] = mapMoverHomeToFixtureAxisTarget(
          entry.fixture,
          plannerKey,
          timeState
        )
        return
      }

      axisOverridesByFixtureIdx[entry.fixtureIdx] = mapMoverPointToFixtureAxisTarget(
        entry.fixture,
        padTarget.x,
        padTarget.y,
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

