import {
  DMX_MAX_VALUE,
  DMX_MIN_VALUE,
  DMX_NUM_CHANNELS,
  FlattenedFixture,
  MoverBounds,
} from '../../shared/dmxFixtures'
import { CleanReduxState } from '../../renderer/redux/store'
import {
  getDmxValue,
  getFixturesInGroups,
  flatten_fixtures,
  forEachChannel,
  getDefaultDmxValue,
  type MoverAxisOverrides,
} from '../../shared/dmxUtil'
import { indexArray, zip } from '../../shared/util'
import { TimeState } from '../../shared/TimeState'
import { SplitState } from 'renderer/redux/realtimeStore'
import { getUniverseOverwrites } from '../../renderer/redux/mixerSlice'
import { clampNormalized, lerp } from '../../math/util'
import { getParam } from '../../shared/params'

function getUniverseCount(state: CleanReduxState): number {
  const configuredUniverseCount =
    state.control.device.connectionSettings.universeCount ?? 1

  const maxFixtureUniverse = state.dmx.universe.reduce((maxUniverse, fixture) => {
    const fixtureUniverse = fixture.universe ?? 1
    return Math.max(maxUniverse, fixtureUniverse)
  }, 1)

  return Math.max(1, configuredUniverseCount, maxFixtureUniverse)
}

function getSyntheticStrobeFrameRateHz(state: CleanReduxState): number {
  const configuredRefreshHz =
    state.control.device.connectionSettings.openDmxRefreshRateHz ?? 30

  if (!Number.isFinite(configuredRefreshHz)) {
    return 30
  }

  return Math.max(1, configuredRefreshHz)
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

function mapAxisNormalizedToDmx(
  normalized: number,
  calibration?: {
    min: number
    max: number
    invert: boolean
  }
): number {
  const safeNormalized = clampNormalized(normalized)
  if (calibration === undefined) {
    return clampDmxFloatValue(safeNormalized * DMX_MAX_VALUE)
  }

  const min = clampDmxValue(calibration.min, DMX_MIN_VALUE)
  const max = clampDmxValue(calibration.max, DMX_MAX_VALUE)
  const oriented = calibration.invert ? 1 - safeNormalized : safeNormalized
  return clampDmxFloatValue(lerp(min, max, oriented))
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

function mapMoverPointToFixtureAxisTarget(
  fixture: FlattenedFixture,
  x: number,
  y: number
): MoverAxisOverrides {
  const normalizedX = clampNormalized(x)
  const normalizedY = clampNormalized(y)
  const mappedBounds = mapPointToBounds(fixture.moverBounds, normalizedX, normalizedY)
  if (mappedBounds !== undefined) {
    return mappedBounds
  }

  const orientedTiltY =
    fixture.moverMountOrientation === 'inverted'
      ? 1 - normalizedY
      : normalizedY

  return {
    panDmx: mapAxisNormalizedToDmx(normalizedX, fixture.moverCalibration?.pan),
    tiltDmx: mapAxisNormalizedToDmx(orientedTiltY, fixture.moverCalibration?.tilt),
  }
}

function mirrorAroundCenter(value: number, center: number): number {
  return center * 2 - value
}

function findClosestReferenceIndex<T>(
  items: T[],
  isReference: (item: T, index: number) => boolean,
  targetIndex: number,
  primaryDistance: (left: T, right: T) => number,
  secondaryDistance: (left: T, right: T) => number
): number | undefined {
  const target = items[targetIndex]
  if (target === undefined) {
    return undefined
  }

  let bestIndex: number | undefined
  let bestPrimary = Number.POSITIVE_INFINITY
  let bestSecondary = Number.POSITIVE_INFINITY

  items.forEach((candidate, candidateIndex) => {
    if (!isReference(candidate, candidateIndex)) {
      return
    }

    const primary = primaryDistance(target, candidate)
    const secondary = secondaryDistance(target, candidate)
    const candidateId = candidateIndex
    const bestId = bestIndex ?? Number.POSITIVE_INFINITY
    const isBetter =
      primary < bestPrimary - 0.000001 ||
      (Math.abs(primary - bestPrimary) <= 0.000001 &&
        (secondary < bestSecondary - 0.000001 ||
          (Math.abs(secondary - bestSecondary) <= 0.000001 && candidateId < bestId)))

    if (isBetter) {
      bestIndex = candidateIndex
      bestPrimary = primary
      bestSecondary = secondary
    }
  })

  return bestIndex
}

function buildMoverAxisOverridesForSplit(
  splitSceneFixtures: FlattenedFixture[],
  outputParams: SplitState['outputParams']
): { [fixtureIdx: number]: MoverAxisOverrides } {
  const axisOverridesByFixtureIdx: { [fixtureIdx: number]: MoverAxisOverrides } = {}
  const baseX = clampNormalized(getParam(outputParams, 'xAxis'))
  const baseY = clampNormalized(getParam(outputParams, 'yAxis'))
  const spread = clampNormalized(getParam(outputParams, 'moverSpread'))
  const legacyPanMirror = getParam(outputParams, 'xMirror') > 0.5
  const mirrorLeftRight = getParam(outputParams, 'moverMirrorX') > 0.5
  const mirrorTopBottom = getParam(outputParams, 'moverMirrorY') > 0.5
  const moverModeRaw = Number(outputParams.moverMode ?? 0)
  const moverMode = Number.isFinite(moverModeRaw)
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

  for (const [_groupName, fixturesInGroup] of Object.entries(fixturesByGroup)) {
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
      const relX = hasHorizontalSpread
        ? clampNormalized((entry.x - minX) / spanX)
        : orderedFixtures.length <= 1
          ? 0.5
          : entryIndex / (orderedFixtures.length - 1)
      const relY = hasVerticalSpread
        ? clampNormalized((entry.y - minY) / spanY)
        : 0.5

      const isRight = isRightFlags[entryIndex] === true
      const isBottom = isBottomFlags[entryIndex] === true

      let fixtureX = baseX
      let fixtureY = baseY

      if (moverMode === 1) {
        fixtureX = baseX + (relX - 0.5) * spread
        fixtureY = baseY + (relY - 0.5) * spread
      }

      const applyLegacyMirrorX = moverMode !== 2 && legacyPanMirror
      const applyPatternMirrorX = moverMode === 2 && mirrorLeftRight
      const applyGroupMirrorX = applyLegacyMirrorX || applyPatternMirrorX
      const applyGroupMirrorY = moverMode === 2 && mirrorTopBottom

      // Mirror in target-space relative to the group's center.
      // Left/top fixtures remain the reference; right/bottom fixtures mirror
      // by reflecting the reference side's look-direction in world-space.
      if (applyGroupMirrorX && isRight) {
        if (applyPatternMirrorX) {
          const refIndex = findClosestReferenceIndex(
            orderedFixtures,
            (_candidate, candidateIndex) => isRightFlags[candidateIndex] !== true,
            entryIndex,
            (left, right) => Math.abs(left.y - right.y),
            (left, right) => Math.abs(left.x - right.x)
          )
          if (refIndex !== undefined) {
            const ref = orderedFixtures[refIndex]
            // Keep forward alignment while mirroring left/right turn direction.
            fixtureX = entry.x + ref.x - fixtureX
          } else {
            fixtureX = mirrorAroundCenter(fixtureX, centerX)
          }
        } else {
          // Legacy pan mirror: simple inverse around 0.5.
          fixtureX = 1 - fixtureX
        }
      }
      if (applyGroupMirrorY && isBottom) {
        const refIndex = findClosestReferenceIndex(
          orderedFixtures,
          (_candidate, candidateIndex) => isBottomFlags[candidateIndex] !== true,
          entryIndex,
          (left, right) => Math.abs(left.x - right.x),
          (left, right) => Math.abs(left.y - right.y)
        )
        if (refIndex !== undefined) {
          const ref = orderedFixtures[refIndex]
          // Keep forward alignment while mirroring up/down tilt direction.
          fixtureY = entry.y + ref.y - fixtureY
        } else {
          fixtureY = mirrorAroundCenter(fixtureY, centerY)
        }
      }

      axisOverridesByFixtureIdx[entry.fixtureIdx] = mapMoverPointToFixtureAxisTarget(
        entry.fixture,
        clampNormalized(fixtureX),
        clampNormalized(fixtureY)
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

function getColorMapCalibrationOverrideTarget(
  state: CleanReduxState,
  fixture: FlattenedFixture,
  channel: FlattenedFixture['channels'][number][1]
): number | undefined {
  // Only apply preview output to the chosen color-map channel.
  if (channel.type !== 'colorMap') {
    return undefined
  }

  const override = state.gui.colorMapCalibrationOverride
  if (override === null || fixture.fixtureTypeId !== override.fixtureTypeId) {
    return undefined
  }

  const fixtureType = state.dmx.fixtureTypesByID[override.fixtureTypeId]
  if (fixtureType === undefined) {
    return undefined
  }

  const expectedChannel = fixtureType.channels[override.channelIndex]
  if (expectedChannel === undefined || expectedChannel !== channel) {
    return undefined
  }

  return clampDmxValue(override.dmxValue, DMX_MIN_VALUE)
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

  // All channels start at 0
  const channels = Array(DMX_NUM_CHANNELS).fill(0)

  const moverCalibrationOverride = state.gui.moverCalibrationOverride
  const colorMapCalibrationOverride = state.gui.colorMapCalibrationOverride
  const axisOnlyOverrideMode = !timeState.isPlaying && moverCalibrationOverride !== null
  const colorMapOnlyOverrideMode =
    !timeState.isPlaying && colorMapCalibrationOverride !== null

  if (!timeState.isPlaying && !axisOnlyOverrideMode && !colorMapOnlyOverrideMode) {
    return channels
  }

  const syntheticStrobeFrameRateHz = getSyntheticStrobeFrameRateHz(state)

  // Set each channel to its default value first.
  forEachChannel(all_fixtures, (_fixtureIdx, _fixture, channelIdx, channel) => {
    channels[channelIdx] = getDefaultDmxValue(channel)
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
        channels[channelIdx] = channel.min
        return
      }

      channels[channelIdx] = clampDmxValue(overrideDmx, channel.min)
    })
  } else if (colorMapOnlyOverrideMode && colorMapCalibrationOverride !== null) {
    // While stopped, keep output simple so wheel tuning is immediate.
    forEachChannel(all_fixtures, (_fixtureIdx, fixture, channelIdx, channel) => {
      if (
        fixture.fixtureTypeId === colorMapCalibrationOverride.fixtureTypeId &&
        channel.type === 'master'
      ) {
        channels[channelIdx] = channel.max
        return
      }

      const colorMapOverrideValue =
        channel.type === 'colorMap'
          ? getColorMapCalibrationOverrideTarget(state, fixture, channel)
          : undefined

      if (colorMapOverrideValue !== undefined) {
        channels[channelIdx] = colorMapOverrideValue
      }
    })
  } else {
    const scenes = state.control.light
    const activeScene = scenes.byId[scenes.active]

    for (const [{ outputParams, randomizer }, splitScene] of zip(
      splitStates,
      activeScene.splitScenes
    )) {
      const splitGroups = splitScene.groups

      const splitSceneFixtures = getFixturesInGroups(all_fixtures, splitGroups)
      const splitMoverAxisOverrides = buildMoverAxisOverridesForSplit(
        splitSceneFixtures,
        outputParams
      )

      // Set each channel based on active scene fixtures.
      forEachChannel(
        splitSceneFixtures,
        (fixtureIdx, fixture, channelIdx, channel) => {
          const randomizerLevel = randomizer[fixtureIdx]?.level ?? 1
          const moverAxisOverride =
            channel.type === 'axis'
              ? splitMoverAxisOverrides[fixtureIdx]
              : undefined

          const calibrationOverride =
            channel.type === 'axis'
              ? getMoverCalibrationOverrideTarget(state, fixture.fixtureId)
              : undefined
          const colorMapOverrideValue =
            channel.type === 'colorMap'
              ? getColorMapCalibrationOverrideTarget(state, fixture, channel)
              : undefined

          let axisOverrides: MoverAxisOverrides | undefined = moverAxisOverride

          if (calibrationOverride !== undefined) {
            axisOverrides = {
              panDmx: calibrationOverride.panDmx,
              tiltDmx: calibrationOverride.tiltDmx,
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
              : channel.type === 'colorMap' && colorMapOverrideValue !== undefined
                ? colorMapOverrideValue
                : getDmxValue(
                    channel,
                    outputParams,
                    fixture,
                    state.control.master,
                    randomizerLevel,
                    timeState,
                    syntheticStrobeFrameRateHz,
                    axisOverrides
                  )

          if (channel.type === 'axis') {
            // Axis channels should use the exact computed DMX value.
            channels[channelIdx] = nextValue
          } else {
            channels[channelIdx] = Math.max(channels[channelIdx], nextValue)
          }
        }
      )
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

  return channels
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

