import HsvPad from './HsvPad'
import ParamSlider from './ParamSlider'
import XyPad from './XyParamsPad'
import styled from 'styled-components'
import type { CSSProperties } from 'react'
import { useMemo } from 'react'
import Randomizer from './Randomizer'
import XYAxispad from './XYAxisPad'
import ParamAddButton from './ParamAddButton'
import {
  useActiveLightScene,
  useActiveVisualScene,
  useBaseParams,
  useDeviceSelector,
  useDmxSelector,
  useTypedSelector,
} from 'renderer/redux/store'
import { getCustomChannels } from 'renderer/redux/dmxSlice'
import StrobeControl from './StrobeControl'
import GoboControl from './GoboControl'
import FocusControl from './FocusControl'
import PrismControl from './PrismControl'
import ZParamsPad from './ZParamsPad'
import { useDispatch } from 'react-redux'
import { useEffect } from 'react'
import { deleteBaseParams, setBaseParams } from 'renderer/redux/controlSlice'
import {
  fixtureChannelLeafChannels,
  universeHasMovers,
  isMoverFixtureType,
} from '../../shared/dmxFixtures'
import {
  DefaultParam,
  initBaseParams,
  paramDisplayName,
  visualSliderParams,
} from '../../shared/params'
import { sumVisSliders } from '../visualizer/visualSliderAssignments'
import { listAtmosFxtrs } from '../../shared/atmosphericsMapping'
import { sumAtmosSliders } from '../atmospherics/atmosSliderAssignments'
import { evaluateSceneGroups } from '../../shared/sceneGroups'
import { isDedicatedGroupSplit, visSplitIdx } from '../scenes/splitUiVisibility'
import { LASER_SPLIT_PARAM_KEYS } from '../laser/laserSplitLink'
import { getSplitAuxColorGates } from '../../shared/splitAuxColorGates'
import StageLightMapSplitPreview from '../scenes/StageLightMapSplitPreview'

const moverBundleParams = [
  'xAxis',
  'yAxis',
  'moverFloorLock',
  'moverSpread',
  'moverMirrorX',
  'moverMirrorY',
  'moverMode',
] as const

const atmosphereSplitParams = ['atmosFxtrOnOff', 'atmosFxtrLevel'] as const
const colorControlParams = [
  'hue',
  'saturation',
  'brightness',
  'white',
  'warmWhite',
  'amber',
  'uv',
] as const
const colorControlCoreParams = ['hue', 'saturation', 'brightness', 'white'] as const
const colorControlExtendedParams = ['warmWhite', 'amber', 'uv'] as const
const hsvOnlyParams = ['hue', 'saturation', 'brightness'] as const
const whiteAuxColorParams = ['white', 'warmWhite', 'amber', 'uv'] as const
const colorControlDefaultValues = initBaseParams()

function areClose(a: number | undefined, b: number | undefined) {
  if (a === undefined || b === undefined) return false
  return Math.abs(a - b) <= 0.0001
}

interface Params {
  splitIndex: number
}

const auxColorSliderStyle: CSSProperties = {
  marginRight: '0.35rem',
}

const auxColorSliderLastStyle: CSSProperties = {
  marginRight: '0.85rem',
}

/** Align vertical slider height with XY / Z pads (180px). */
const stageLightMapSliderWrapperStyle: CSSProperties = {
  height: '180px',
  minHeight: '180px',
}

export default function ParamsControl({ splitIndex }: Params) {
  const dispatch = useDispatch()
  const fxtrDepthOn = useTypedSelector(
    (state) => state.gui.fxtrDepthOn
  )
  const dmx = useDmxSelector((state) => state)
  const customChannels = useDmxSelector((dmx) => getCustomChannels(dmx))
  const atmosSettings = useDeviceSelector((state) => state.connectionSettings.atmos)
  const atmosFxtrs = useMemo(() => listAtmosFxtrs(dmx), [dmx])
  const atmosFixtureIdSet = useMemo(
    () => new Set(atmosFxtrs.map((fixture) => fixture.fixtureId)),
    [atmosFxtrs]
  )
  const baseParams = useBaseParams(splitIndex)
  const splitGroups = useActiveLightScene(
    (scene) => scene.splitScenes[splitIndex]?.groups ?? {}
  )
  const allSplitGroups = useActiveLightScene(
    (scene) => scene.splitScenes[0]?.groups ?? {}
  )
  const visualizerSplitIndex = useActiveLightScene((scene) =>
    visSplitIdx(scene.splitScenes)
  )
  const isVisualizerSplit =
    visualizerSplitIndex >= 0 && splitIndex === visualizerSplitIndex
  const splitCapabilities = useMemo(() => {
    let supportsMovers = false
    let supportsAtmosphere = false
    let supportsAtmosphereLightingChannels = false
    let supportsDmxColorChannels = false
    let supportsLed = false
    let matchedMoverFixtures = 0
    let matchedMoverFixturesByAllSplit = 0
    let matchedAtmosFixtures = 0
    let matchedAtmosFixturesByAllSplit = 0
    let matchedLedFixtures = 0
    let matchedLedFixturesByAllSplit = 0

    for (const fixture of dmx.universe) {
      const fixtureType = dmx.fixtureTypesByID[fixture.type]
      if (fixtureType === undefined) {
        continue
      }

      const groupedFixture = new Set(
        fixture.groups
          .map((group) => group.trim())
          .filter((group) => group.length > 0)
      )
      const isAtmosFixture =
        typeof fixture.id === 'string' &&
        fixture.id.trim().length > 0 &&
        atmosFixtureIdSet.has(fixture.id)
      const isMoverFixture = isMoverFixtureType(fixtureType)

      const matchesGroups = (groups: Record<string, boolean | undefined>) =>
        evaluateSceneGroups(groups, (group) => {
          const normalized = group.trim()
          if (normalized.length <= 0) return false
          if (normalized === 'Visualizer') return false
          if (normalized === 'Movers') return isMoverFixture
          if (normalized === 'Atmosphere') return isAtmosFixture
          return groupedFixture.has(normalized)
        })

      const matchesSplit = matchesGroups(splitGroups)
      if (!matchesSplit) continue

      const matchesAllSplit = matchesGroups(allSplitGroups)
      const hasLightingChannels = fixtureType.channels
        .flatMap((channel) => fixtureChannelLeafChannels(channel))
        .some((channel) => {
          return (
            channel.type === 'master' ||
            channel.type === 'color' ||
            channel.type === 'colorMap' ||
            channel.type === 'strobe'
          )
        })
      supportsDmxColorChannels = supportsDmxColorChannels || hasLightingChannels

      if (isMoverFixture) {
        supportsMovers = true
        matchedMoverFixtures += 1
        if (matchesAllSplit) {
          matchedMoverFixturesByAllSplit += 1
        }
      }
      if (isAtmosFixture) {
        supportsAtmosphere = true
        matchedAtmosFixtures += 1
        if (matchesAllSplit) {
          matchedAtmosFixturesByAllSplit += 1
        }
        supportsAtmosphereLightingChannels =
          supportsAtmosphereLightingChannels || hasLightingChannels
      }
      if (supportsMovers && supportsAtmosphere && supportsAtmosphereLightingChannels) {
        break
      }
    }

    for (const ledFixture of dmx.led.ledFixtures) {
      const groupedFixture = new Set(
        ledFixture.groups
          .map((group) => group.trim())
          .filter((group) => group.length > 0)
      )
      const matchesGroups = (groups: Record<string, boolean | undefined>) =>
        evaluateSceneGroups(groups, (group) => {
          const normalized = group.trim()
          if (normalized.length <= 0) return false
          if (normalized === 'Visualizer') return false
          if (normalized === 'LEDs' || normalized === 'Pixels') {
            return groupedFixture.has('LEDs') || groupedFixture.has('Pixels')
          }
          return groupedFixture.has(normalized)
        })

      if (!matchesGroups(splitGroups)) continue
      supportsLed = true
      matchedLedFixtures += 1
      if (matchesGroups(allSplitGroups)) {
        matchedLedFixturesByAllSplit += 1
      }
    }

    return {
      supportsMovers,
      supportsAtmosphere,
      supportsLed,
      supportsColorChannels: supportsDmxColorChannels || supportsLed,
      supportsDmxColorChannels,
      supportsAtmosphereLightingChannels,
      moverExcludedFromAllSplit:
        matchedMoverFixtures > 0 && matchedMoverFixturesByAllSplit === 0,
      atmosphereExcludedFromAllSplit:
        matchedAtmosFixtures > 0 && matchedAtmosFixturesByAllSplit === 0,
      ledExcludedFromAllSplit:
        matchedLedFixtures > 0 && matchedLedFixturesByAllSplit === 0,
    }
  }, [allSplitGroups, atmosFixtureIdSet, dmx, splitGroups])

  const auxColorGates = useMemo(
    () => getSplitAuxColorGates(dmx, splitGroups, atmosFixtureIdSet),
    [atmosFixtureIdSet, dmx, splitGroups]
  )

  const hasMoverFixturesInProject = useMemo(
    () => universeHasMovers(dmx.universe, dmx.fixtureTypesByID),
    [dmx.universe, dmx.fixtureTypesByID]
  )
  const showMoverControls =
    hasMoverFixturesInProject && splitCapabilities.supportsMovers
  const isAtmosphereSplit = splitCapabilities.supportsAtmosphere
  const isLedSplit = splitCapabilities.supportsLed
  const isAllSplit = splitIndex === 0
  const moversGroupActive =
    hasMoverFixturesInProject && splitGroups.Movers === true
  const splitIncludesAtmosphereGroup = splitGroups.Atmosphere === true
  const splitIncludesLedGroup = splitGroups.LEDs === true || splitGroups.Pixels === true
  const visualConfig = useActiveVisualScene((scene) => scene.config)
  const visualSliderAssignments = useMemo(
    () => sumVisSliders(visualConfig),
    [visualConfig]
  )
  const atmosSliderAssignments = useMemo(
    () => sumAtmosSliders(atmosSettings, atmosFxtrs),
    [atmosSettings, atmosFxtrs]
  )
  const mergedSliderLabels = useMemo(
    () => ({
      ...visualSliderAssignments.labelsBySlider,
      ...atmosSliderAssignments.labelsBySlider,
    }),
    [visualSliderAssignments.labelsBySlider, atmosSliderAssignments.labelsBySlider]
  )

  useEffect(() => {
    if (baseParams.xMirror === undefined) return
    dispatch(
      deleteBaseParams({
        splitIndex,
        params: ['xMirror'],
      })
    )
  }, [baseParams.xMirror, dispatch, splitIndex])

  useEffect(() => {
    if (!showMoverControls) return

    // Normalize partially-defined mover bundles, but do not re-add a bundle
    // that the user explicitly removed.
    const hasAnyMoverAxisParam =
      baseParams.xAxis !== undefined ||
      baseParams.yAxis !== undefined ||
      baseParams.moverFloorLock !== undefined ||
      baseParams.moverSpread !== undefined ||
      baseParams.moverMirrorX !== undefined ||
      baseParams.moverMirrorY !== undefined ||
      baseParams.moverMode !== undefined
    if (!hasAnyMoverAxisParam) return

    const missingMoverControls =
      baseParams.xAxis === undefined ||
      baseParams.yAxis === undefined ||
      baseParams.moverMode === undefined ||
      baseParams.moverFloorLock === undefined ||
      baseParams.moverSpread === undefined ||
      baseParams.moverMirrorX === undefined ||
      baseParams.moverMirrorY === undefined
    if (!missingMoverControls) return

    dispatch(
      setBaseParams({
        splitIndex,
        params: {
          xAxis: baseParams.xAxis ?? 0.5,
          yAxis: baseParams.yAxis ?? 0.5,
          moverFloorLock: baseParams.moverFloorLock ?? 0,
          moverSpread: baseParams.moverSpread ?? 0,
          moverMirrorX: baseParams.moverMirrorX ?? 0,
          moverMirrorY: baseParams.moverMirrorY ?? 0,
          moverMode: baseParams.moverMode ?? 0,
        },
      })
    )
  }, [baseParams, dispatch, showMoverControls, splitIndex])

  useEffect(() => {
    if (hasMoverFixturesInProject && splitCapabilities.supportsMovers) return
    const hasMoverParams = moverBundleParams.some(
      (param) => baseParams[param] !== undefined
    )
    if (!hasMoverParams) return
    dispatch(
      deleteBaseParams({
        splitIndex,
        params: moverBundleParams,
      })
    )
  }, [
    baseParams,
    dispatch,
    hasMoverFixturesInProject,
    splitCapabilities.supportsMovers,
    splitIndex,
  ])

  useEffect(() => {
    if (splitCapabilities.supportsAtmosphere) return
    const hasAtmosphereParams = atmosphereSplitParams.some(
      (param) => baseParams[param] !== undefined
    )
    if (!hasAtmosphereParams) return
    dispatch(
      deleteBaseParams({
        splitIndex,
        params: atmosphereSplitParams,
      })
    )
  }, [baseParams, dispatch, splitCapabilities.supportsAtmosphere, splitIndex])

  const hasAnyColorControls = colorControlParams.some(
    (param) => baseParams[param] !== undefined
  )
  const hasCoreColorControls = colorControlCoreParams.every(
    (param) => baseParams[param] !== undefined
  )
  const hasExtendedColorControls = colorControlExtendedParams.some(
    (param) => baseParams[param] !== undefined
  )
  const hasFullColorControls = colorControlParams.every(
    (param) => baseParams[param] !== undefined
  )
  const colorControlsAreDefault = colorControlParams.every((param) => {
    const expected = colorControlDefaultValues[param as DefaultParam]
    return (
      baseParams[param] === undefined ||
      areClose(baseParams[param], expected)
    )
  })
  const shouldAutoAddColorControls =
    (moversGroupActive && splitCapabilities.moverExcludedFromAllSplit) ||
    (splitIncludesAtmosphereGroup &&
      splitCapabilities.atmosphereExcludedFromAllSplit &&
      splitCapabilities.supportsAtmosphereLightingChannels)
  const shouldTrimExtendedColorControlsForLedSplit =
    splitIncludesLedGroup &&
    splitCapabilities.supportsLed &&
    !splitCapabilities.supportsDmxColorChannels

  useEffect(() => {
    if (!shouldTrimExtendedColorControlsForLedSplit) return
    if (!hasExtendedColorControls) return
    dispatch(
      deleteBaseParams({
        splitIndex,
        params: colorControlExtendedParams,
      })
    )
  }, [
    dispatch,
    hasExtendedColorControls,
    shouldTrimExtendedColorControlsForLedSplit,
    splitIndex,
  ])

  useEffect(() => {
    if (!isVisualizerSplit) return
    const hasAux = whiteAuxColorParams.some(
      (param) => baseParams[param as DefaultParam] !== undefined
    )
    if (!hasAux) return
    dispatch(
      deleteBaseParams({
        splitIndex,
        params: [...whiteAuxColorParams],
      })
    )
  }, [baseParams, dispatch, isVisualizerSplit, splitIndex])

  useEffect(() => {
    if (isVisualizerSplit) return
    const toRemove: string[] = []
    if (baseParams.white !== undefined && !auxColorGates.white) {
      toRemove.push('white')
    }
    if (baseParams.warmWhite !== undefined && !auxColorGates.warmWhite) {
      toRemove.push('warmWhite')
    }
    if (baseParams.amber !== undefined && !auxColorGates.amber) {
      toRemove.push('amber')
    }
    if (baseParams.uv !== undefined && !auxColorGates.uv) {
      toRemove.push('uv')
    }
    if (toRemove.length === 0) return
    dispatch(
      deleteBaseParams({
        splitIndex,
        params: toRemove,
      })
    )
  }, [
    auxColorGates.amber,
    auxColorGates.uv,
    auxColorGates.warmWhite,
    auxColorGates.white,
    baseParams.amber,
    baseParams.uv,
    baseParams.warmWhite,
    baseParams.white,
    dispatch,
    isVisualizerSplit,
    splitIndex,
  ])

  useEffect(() => {
    if (isAllSplit) {
      if (hasFullColorControls) return
      const paramsToAdd: Record<string, number> = {}
      colorControlParams.forEach((param) => {
        if (baseParams[param] !== undefined) return
        if (param === 'white' && !auxColorGates.white) return
        if (param === 'warmWhite' && !auxColorGates.warmWhite) return
        if (param === 'amber' && !auxColorGates.amber) return
        if (param === 'uv' && !auxColorGates.uv) return
        paramsToAdd[param] =
          colorControlDefaultValues[param as DefaultParam] ?? 0
      })
      if (Object.keys(paramsToAdd).length > 0) {
        dispatch(
          setBaseParams({
            splitIndex,
            params: paramsToAdd,
          })
        )
      }
      return
    }

    if (splitIncludesLedGroup && splitCapabilities.supportsLed) {
      const hasHueSatBright = hsvOnlyParams.every(
        (param) => baseParams[param as DefaultParam] !== undefined
      )
      const ledCoreComplete =
        hasHueSatBright &&
        (!auxColorGates.white || baseParams.white !== undefined)
      if (ledCoreComplete) return
      const paramsToAdd: Record<string, number> = {}
      for (const param of ['hue', 'saturation', 'brightness'] as const) {
        if (baseParams[param] === undefined) {
          paramsToAdd[param] =
            colorControlDefaultValues[param as DefaultParam] ?? 0
        }
      }
      if (auxColorGates.white && baseParams.white === undefined) {
        paramsToAdd.white =
          colorControlDefaultValues.white ?? 0
      }
      if (Object.keys(paramsToAdd).length > 0) {
        dispatch(
          setBaseParams({
            splitIndex,
            params: paramsToAdd,
          })
        )
      }
      return
    }

    if (!moversGroupActive && !splitIncludesAtmosphereGroup) {
      return
    }

    if (shouldAutoAddColorControls) {
      if (hasFullColorControls) return
      const paramsToAdd: Record<string, number> = {}
      colorControlParams.forEach((param) => {
        if (baseParams[param] !== undefined) return
        if (param === 'white' && !auxColorGates.white) return
        if (param === 'warmWhite' && !auxColorGates.warmWhite) return
        if (param === 'amber' && !auxColorGates.amber) return
        if (param === 'uv' && !auxColorGates.uv) return
        paramsToAdd[param] =
          colorControlDefaultValues[param as DefaultParam] ?? 0
      })
      if (Object.keys(paramsToAdd).length > 0) {
        dispatch(
          setBaseParams({
            splitIndex,
            params: paramsToAdd,
          })
        )
      }
      return
    }

    if (!hasAnyColorControls) return
    if (!colorControlsAreDefault) return
    dispatch(
      deleteBaseParams({
        splitIndex,
        params: colorControlParams,
      })
    )
  }, [
    baseParams,
    colorControlsAreDefault,
    dispatch,
    hasAnyColorControls,
    hasCoreColorControls,
    hasExtendedColorControls,
    hasFullColorControls,
    isAllSplit,
    isLedSplit,
    moversGroupActive,
    shouldTrimExtendedColorControlsForLedSplit,
    splitIncludesAtmosphereGroup,
    splitIncludesLedGroup,
    shouldAutoAddColorControls,
    splitIndex,
    auxColorGates.amber,
    auxColorGates.uv,
    auxColorGates.warmWhite,
    auxColorGates.white,
  ])

  const activeVisualizerSliders = visualSliderParams.filter(
    (param) => baseParams[param] !== undefined
  )

  const laserGroupName = useMemo(() => {
    const entries = Object.entries(splitGroups).filter(
      ([, included]) => included === true
    )
    return entries.length === 1 ? entries[0]![0] : null
  }, [splitGroups])

  const showLaserSliders =
    laserGroupName !== null &&
    isDedicatedGroupSplit(splitGroups, laserGroupName) &&
    !['Movers', 'Atmosphere', 'LEDs', 'Pixels', 'Visualizer'].includes(
      laserGroupName
    )

  const activeLaserSplitParams = LASER_SPLIT_PARAM_KEYS.filter(
    (param) => baseParams[param] !== undefined
  )

  const hasHsvControls = hsvOnlyParams.every(
    (param) => baseParams[param as DefaultParam] !== undefined
  )

  const showAuxColorSliders =
    hasHsvControls &&
    !isVisualizerSplit &&
    ((baseParams.white !== undefined && auxColorGates.white) ||
      (!shouldTrimExtendedColorControlsForLedSplit &&
        baseParams.warmWhite !== undefined &&
        auxColorGates.warmWhite) ||
      (!shouldTrimExtendedColorControlsForLedSplit &&
        baseParams.amber !== undefined &&
        auxColorGates.amber) ||
      (!shouldTrimExtendedColorControlsForLedSplit &&
        baseParams.uv !== undefined &&
        auxColorGates.uv))

  return (
    <Root>
      {hasHsvControls && <HsvPad splitIndex={splitIndex} />}
      {showAuxColorSliders && (
        <AuxColorRoot>
          {baseParams.white !== undefined && auxColorGates.white && (
            <ParamSlider
              param={'white'}
              splitIndex={splitIndex}
              hideRemoveButton
              label={'White'}
              wrapperStyle={auxColorSliderStyle}
            />
          )}
          {!shouldTrimExtendedColorControlsForLedSplit &&
            baseParams.warmWhite !== undefined &&
            auxColorGates.warmWhite && (
              <ParamSlider
                param={'warmWhite'}
                splitIndex={splitIndex}
                hideRemoveButton
                label={'Warm White'}
                wrapperStyle={auxColorSliderStyle}
              />
            )}
          {!shouldTrimExtendedColorControlsForLedSplit &&
            baseParams.amber !== undefined &&
            auxColorGates.amber && (
              <ParamSlider
                param={'amber'}
                splitIndex={splitIndex}
                hideRemoveButton
                label={'Amber'}
                wrapperStyle={auxColorSliderStyle}
              />
            )}
          {!shouldTrimExtendedColorControlsForLedSplit &&
            baseParams.uv !== undefined &&
            auxColorGates.uv && (
              <ParamSlider
                param={'uv'}
                splitIndex={splitIndex}
                hideRemoveButton
                label={'UV'}
                wrapperStyle={auxColorSliderLastStyle}
              />
            )}
        </AuxColorRoot>
      )}
      {baseParams.visStageMapMix !== undefined && !isVisualizerSplit && (
        <StageLightMapRow>
          <StageLightMapSplitPreview />
          <ParamSlider
            param="visStageMapMix"
            splitIndex={splitIndex}
            label="Stage light map"
            wrapperStyle={stageLightMapSliderWrapperStyle}
          />
        </StageLightMapRow>
      )}
      {baseParams.x !== undefined && baseParams.y !== undefined && (
        <XyPad splitIndex={splitIndex} />
      )}
      {fxtrDepthOn ? (
        <ZParamsPad splitIndex={splitIndex} />
      ) : null}
      {showMoverControls && <XYAxispad splitIndex={splitIndex} />}
      <Randomizer splitIndex={splitIndex} />
      <StrobeControl splitIndex={splitIndex} />
      <GoboControl splitIndex={splitIndex} />
      <FocusControl splitIndex={splitIndex} />
      <PrismControl splitIndex={splitIndex} />
      <ParamSlider param={'intensity'} splitIndex={splitIndex} />
      {isAtmosphereSplit && (
        <AtmosphereSliderRow>
          <ParamSlider
            param={'atmosFxtrOnOff'}
            splitIndex={splitIndex}
            label={'FX On/Off'}
            manualCursorColor="#69b6ff"
            hideRemoveButton
          />
          <ParamSlider
            param={'atmosFxtrLevel'}
            splitIndex={splitIndex}
            label={'FX Level'}
            hideRemoveButton
          />
        </AtmosphereSliderRow>
      )}
      {Array.from(customChannels).map((name) => (
        <ParamSlider key={name} param={name} splitIndex={splitIndex} />
      ))}
      {isVisualizerSplit && activeVisualizerSliders.length > 0 && (
        <VisualizerSliderRow>
          {activeVisualizerSliders.map((param, index) => (
            <ParamSlider
              key={param}
              param={param}
              splitIndex={splitIndex}
              hideRemoveButton
              label={
                mergedSliderLabels[param as keyof typeof mergedSliderLabels] ??
                `V${param.replace('visSlider', '') || index + 1}`
              }
            />
          ))}
        </VisualizerSliderRow>
      )}
      {showLaserSliders && activeLaserSplitParams.length > 0 && (
        <LaserSliderRow>
          {activeLaserSplitParams.map((param) => (
            <ParamSlider
              key={param}
              param={param}
              splitIndex={splitIndex}
              hideRemoveButton
              label={paramDisplayName(param)}
            />
          ))}
        </LaserSliderRow>
      )}
      <ParamAddButton splitIndex={splitIndex} />
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  width: max-content;
  min-width: 100%;

  > * {
    flex: 0 0 auto;
  }
`

const AuxColorRoot = styled.div`
  display: flex;
  align-items: flex-start;
`

const VisualizerSliderRow = styled.div`
  display: flex;
  align-items: flex-start;
`

const LaserSliderRow = styled.div`
  display: flex;
  align-items: flex-start;
`

const AtmosphereSliderRow = styled.div`
  display: flex;
  align-items: flex-start;
`

const StageLightMapRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: stretch;
  height: 180px;
  gap: 0.42rem;
`

