import IconButton from '@mui/material/IconButton'
import AddIcon from '@mui/icons-material/Add'
import { useMemo, useState, FunctionComponent } from 'react'
import {
  useActiveLightScene,
  useActiveVisualScene,
  useBaseParams,
  useDeviceSelector,
  useDmxSelector,
  useTypedSelector,
} from 'renderer/redux/store'
import styled from 'styled-components'
import Popup from '../base/Popup'
import { PopupTitleRow } from '../base/SectionHelpPopover'
import { useDispatch } from 'react-redux'
import {
  DefaultParam,
  Params,
  defaultParamsList,
  paramDisplayName,
  visualSliderParams,
} from 'shared/params'
import { setBaseParams } from 'renderer/redux/controlSlice'
import { initParams } from 'shared/params'
import IntensityIcon from '@mui/icons-material/LocalFireDepartment'
import StrobeIcon from '@mui/icons-material/LightMode'
import RandomizeIcon from '@mui/icons-material/Shuffle'
import PositionIcon from '@mui/icons-material/PictureInPicture'
import axisIconSrc from '../../../assets/axis.svg'
import { getAllParamKeys, getCustomChannels } from 'renderer/redux/dmxSlice'
import { sumVisSliders } from '../visualizer/visualSliderAssignments'
import { evaluateSceneGroups } from 'shared/sceneGroups'
import {
  fixtureChannelLeafChannels,
  universeHasMovers,
  isMoverFixtureType,
} from 'shared/dmxFixtures'
import { listAtmosFxtrs } from '../../shared/atmosphericsMapping'
import { sumAtmosSliders } from '../atmospherics/atmosSliderAssignments'
import { visSplitIdx } from '../scenes/splitUiVisibility'
import { getSplitAuxColorGates } from '../../shared/splitAuxColorGates'
import type { AuxColorGates } from '../../shared/splitAuxColorGates'
import { AddParamsHelpButton } from '../scenes/sceneHelpButtons'

interface Props {
  splitIndex: number
}

type ParamBundle = 'axis' | 'position' | 'depth' | 'hsb' | 'wwauv'
const paramBundleList: ParamBundle[] = ['position', 'depth', 'hsb', 'wwauv', 'axis']
const visualSliderParamSet = new Set<string>(visualSliderParams as readonly string[])
const moverOnlyParamSet = new Set<string>([
  'xAxis',
  'yAxis',
  'moverFloorLock',
  'moverSpread',
  'moverMirrorX',
  'moverMirrorY',
  'moverMode',
])
const atmosphereOnlyParamSet = new Set<string>(['atmosFxtrOnOff', 'atmosFxtrLevel'])
const colorParamSet = new Set<string>([
  'hue',
  'saturation',
  'brightness',
  'white',
  'warmWhite',
  'amber',
  'uv',
])
export const paramBundles: { [key in ParamBundle]: DefaultParam[] } = {
  axis: [
    'xAxis',
    'yAxis',
    'moverFloorLock',
    'moverSpread',
    'moverMirrorX',
    'moverMirrorY',
    'moverMode',
  ],
  position: ['x', 'y', 'width', 'height', 'positionFeather'],
  depth: ['z', 'depth'],
  hsb: ['hue', 'saturation', 'brightness'],
  wwauv: ['white', 'warmWhite', 'amber', 'uv'],
}

/** Params owned by the XY pad; removed together via the bundle X only. */
export const positionPadParams = paramBundles.position

function Axis() {
  return <img style={{ width: '1.5rem', height: '1.5rem' }} src={axisIconSrc} />
}

const icons: {
  [key in ParamBundle | DefaultParam | string]?: FunctionComponent
} = {
  strobe: () => <StrobeIcon />,
  randomize: () => <RandomizeIcon />,
  position: () => <PositionIcon />,
  depth: () => <PositionIcon />,
  intensity: () => <IntensityIcon />,
  axis: Axis,
}

const initialParams = initParams()

function optionDisplayName(
  option: DefaultParam | ParamBundle | string,
  visualSliderLabels: Partial<Record<string, string>>
): string {
  if (option === 'axis') return 'Pan/Tilt'
  if (option === 'position') return 'Position'
  if (option === 'depth') return 'Z Depth'
  if (option === 'hsb') return 'HSB Color'
  if (option === 'wwauv') return 'White / Warm / Amber / UV'
  if (visualSliderParamSet.has(option)) {
    return visualSliderLabels[option] ?? paramDisplayName(option)
  }
  return paramDisplayName(option)
}

function getOptions(
  customChannels: Set<string>,
  baseParams: Params,
  allParamKeys: string[],
  isVisualizerSplit: boolean,
  activeVisualizerSliders: Set<string>,
  splitSupportsMovers: boolean,
  splitSupportsGobo: boolean,
  splitSupportsFocus: boolean,
  splitSupportsPrism: boolean,
  splitSupportsAtmosphere: boolean,
  splitSupportsColorChannels: boolean,
  auxColorGates: AuxColorGates,
  fxtrDepthEnabled: boolean
): (DefaultParam | ParamBundle | string)[] {
  const defaultParamSet = new Set(defaultParamsList as string[])

  const paramOptions: (DefaultParam | ParamBundle | string)[] =
    defaultParamsList.filter((param) => {
      if (!fxtrDepthEnabled && (param === 'z' || param === 'depth')) {
        return false
      }
      if (param === 'xMirror') {
        return false
      }
      if (moverOnlyParamSet.has(param) && !splitSupportsMovers) {
        return false
      }
      if (atmosphereOnlyParamSet.has(param) && !splitSupportsAtmosphere) {
        return false
      }
      if (param === 'white' && !auxColorGates.white) {
        return false
      }
      if (param === 'warmWhite' && !auxColorGates.warmWhite) {
        return false
      }
      if (param === 'amber' && !auxColorGates.amber) {
        return false
      }
      if (param === 'uv' && !auxColorGates.uv) {
        return false
      }
      if (
        colorParamSet.has(param) &&
        !splitSupportsColorChannels &&
        !(
          isVisualizerSplit &&
          (param === 'hue' || param === 'saturation' || param === 'brightness')
        )
      ) {
        return false
      }
      if (
        isVisualizerSplit &&
        (param === 'white' ||
          param === 'warmWhite' ||
          param === 'amber' ||
          param === 'uv')
      ) {
        return false
      }
      if (!isVisualizerSplit && visualSliderParamSet.has(param)) {
        return false
      }
      if (
        isVisualizerSplit &&
        visualSliderParamSet.has(param) &&
        !activeVisualizerSliders.has(param)
      ) {
        return false
      }
      const isActive = baseParams[param] !== undefined
      const isInBundle = paramBundleList.find((pb) =>
        paramBundles[pb].find((p) => p === param)
      )
      return !isActive && !isInBundle && !(param === 'intensity')
    })

  const paramBundleOptions = paramBundleList.filter((pb) => {
    if (pb === 'depth' && !fxtrDepthEnabled) {
      return false
    }
    if (pb === 'axis' && !splitSupportsMovers) {
      return false
    }
    if (
      (pb === 'hsb' || pb === 'wwauv') &&
      !splitSupportsColorChannels &&
      !(pb === 'hsb' && isVisualizerSplit)
    ) {
      return false
    }
    if (pb === 'wwauv' && isVisualizerSplit) {
      return false
    }
    if (
      pb === 'wwauv' &&
      !auxColorGates.white &&
      !auxColorGates.warmWhite &&
      !auxColorGates.amber &&
      !auxColorGates.uv
    ) {
      return false
    }
    let isActive = false
    if (pb === 'wwauv') {
      const relevant = paramBundles[pb].filter((param) => {
        if (param === 'white') return auxColorGates.white
        if (param === 'warmWhite') return auxColorGates.warmWhite
        if (param === 'amber') return auxColorGates.amber
        if (param === 'uv') return auxColorGates.uv
        return false
      })
      isActive =
        relevant.length > 0 &&
        relevant.every((param) => baseParams[param] !== undefined)
    } else {
      isActive = paramBundles[pb].reduce(
        (accum, param) => accum && baseParams[param] !== undefined,
        true
      )
    }
    return !isActive
  })

  const customParamOptions = Array.from(customChannels).filter(
    (option) =>
      baseParams[option] === undefined &&
      (!atmosphereOnlyParamSet.has(option) || splitSupportsAtmosphere) &&
      (option !== 'warmWhite' || auxColorGates.warmWhite) &&
      (option !== 'amber' || auxColorGates.amber) &&
      (option !== 'uv' || auxColorGates.uv) &&
      (option !== 'white' || auxColorGates.white) &&
      (!moverOnlyParamSet.has(option) || splitSupportsMovers) &&
      (option !== 'gobo' || splitSupportsGobo) &&
      (option !== 'focus' || splitSupportsFocus) &&
      (option !== 'prism' || splitSupportsPrism)
  )

  const dynamicParamOptions = allParamKeys.filter(
    (option) =>
      !defaultParamSet.has(option) &&
      !customChannels.has(option) &&
      baseParams[option] === undefined &&
      (!colorParamSet.has(option) || splitSupportsColorChannels) &&
      (option !== 'warmWhite' || auxColorGates.warmWhite) &&
      (option !== 'amber' || auxColorGates.amber) &&
      (option !== 'uv' || auxColorGates.uv) &&
      (option !== 'white' || auxColorGates.white) &&
      (!atmosphereOnlyParamSet.has(option) || splitSupportsAtmosphere) &&
      (!moverOnlyParamSet.has(option) || splitSupportsMovers) &&
      (option !== 'gobo' || splitSupportsGobo) &&
      (option !== 'focus' || splitSupportsFocus) &&
      (option !== 'prism' || splitSupportsPrism)
  )

  return paramOptions
    .concat(paramBundleOptions)
    .concat(customParamOptions)
    .concat(dynamicParamOptions)
}

export default function ParamAddButton({ splitIndex }: Props) {
  const dispatch = useDispatch()
  const [isOpen, setIsOpen] = useState(false)
  const fxtrDepthOn = useTypedSelector((state) => state.gui.fxtrDepthOn)
  const dmx = useDmxSelector((state) => state)
  const baseParams = useBaseParams(splitIndex)
  const customChannels = useDmxSelector((dmx) => getCustomChannels(dmx))
  const allParamKeys = useDmxSelector((dmx) => getAllParamKeys(dmx))
  const splitGroups = useActiveLightScene(
    (scene) => scene.splitScenes[splitIndex]?.groups ?? {}
  )
  const visualizerSplitIndex = useActiveLightScene((scene) =>
    visSplitIdx(scene.splitScenes)
  )
  const isVisualizerSplit =
    visualizerSplitIndex >= 0 && splitIndex === visualizerSplitIndex
  const visualConfig = useActiveVisualScene((scene) => scene.config)
  const atmosSettings = useDeviceSelector((state) => state.connectionSettings.atmos)
  const atmosFxtrs = useMemo(() => listAtmosFxtrs(dmx), [dmx])
  const atmosFixtureIdSet = useMemo(
    () => new Set(atmosFxtrs.map((fixture) => fixture.fixtureId)),
    [atmosFxtrs]
  )
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
  const activeVisualizerSliders = useMemo(() => {
    const merged = new Set<string>()
    visualSliderAssignments.activeSliders.forEach((slider) => merged.add(slider))
    atmosSliderAssignments.activeSliders.forEach((slider) => merged.add(slider))
    return merged
  }, [visualSliderAssignments.activeSliders, atmosSliderAssignments.activeSliders])
  const hasMoverFixturesInProject = useMemo(
    () => universeHasMovers(dmx.universe, dmx.fixtureTypesByID),
    [dmx.universe, dmx.fixtureTypesByID]
  )
  const splitCapabilities = useDmxSelector((dmx) => {
    let supportsMovers = false
    let supportsGobo = false
    let supportsFocus = false
    let supportsPrism = false
    let supportsAtmosphere = false
    let supportsDmxColorChannels = false
    let supportsLedColorChannels = false

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

      const matchesSplit = evaluateSceneGroups(splitGroups, (group) => {
        const normalized = group.trim()
        if (normalized.length <= 0) return false
        if (normalized === 'Visualizer') return false
        if (normalized === 'Movers') return isMoverFixtureType(fixtureType)
        return groupedFixture.has(normalized)
      })

      if (!matchesSplit) {
        continue
      }

      if (isMoverFixtureType(fixtureType)) {
        supportsMovers = true
      }
      if (fixtureType.channels.some((channel) => channel.type === 'goboMap')) {
        supportsGobo = true
      }
      if (
        fixtureType.channels
          .flatMap((channel) => fixtureChannelLeafChannels(channel))
          .some((channel) => channel.type === 'focus')
      ) {
        supportsFocus = true
      }
      if (fixtureType.channels.some((channel) => channel.type === 'prismMap')) {
        supportsPrism = true
      }
      if (
        fixtureType.channels
          .flatMap((channel) => fixtureChannelLeafChannels(channel))
          .some((channel) => {
            return (
              channel.type === 'master' ||
              channel.type === 'color' ||
              channel.type === 'colorMap' ||
              channel.type === 'strobe'
            )
          })
      ) {
        supportsDmxColorChannels = true
      }
      if (
        typeof fixture.id === 'string' &&
        fixture.id.trim().length > 0 &&
        atmosFixtureIdSet.has(fixture.id)
      ) {
        supportsAtmosphere = true
      }

      if (
        supportsMovers &&
        supportsGobo &&
        supportsFocus &&
        supportsPrism &&
        supportsAtmosphere &&
        supportsDmxColorChannels
      ) {
        break
      }
    }

    for (const ledFixture of dmx.led.ledFixtures) {
      const groupedFixture = new Set(
        ledFixture.groups.map((group) => group.trim()).filter((group) => group.length > 0)
      )
      const matchesSplit = evaluateSceneGroups(splitGroups, (group) => {
        const normalized = group.trim()
        if (normalized.length <= 0) return false
        if (normalized === 'Visualizer') return false
        if (normalized === 'LEDs' || normalized === 'Pixels') {
          return groupedFixture.has('LEDs') || groupedFixture.has('Pixels')
        }
        return groupedFixture.has(normalized)
      })
      if (!matchesSplit) continue
      supportsLedColorChannels = true
    }

    return {
      supportsMovers,
      supportsGobo,
      supportsFocus,
      supportsPrism,
      supportsAtmosphere,
      supportsColorChannels: supportsDmxColorChannels || supportsLedColorChannels,
    }
  })

  const auxColorGates = useMemo(
    () => getSplitAuxColorGates(dmx, splitGroups, atmosFixtureIdSet),
    [atmosFixtureIdSet, dmx, splitGroups]
  )

  const splitSupportsMoversInUi =
    hasMoverFixturesInProject && splitCapabilities.supportsMovers
  const unusableOptions: Set<DefaultParam | ParamBundle | string> = new Set()
  if (!splitSupportsMoversInUi) unusableOptions.add('axis')

  const options = getOptions(
    customChannels,
    baseParams,
    allParamKeys,
    isVisualizerSplit,
    activeVisualizerSliders,
    splitSupportsMoversInUi,
    splitCapabilities.supportsGobo,
    splitCapabilities.supportsFocus,
    splitCapabilities.supportsPrism,
    splitCapabilities.supportsAtmosphere,
    splitCapabilities.supportsColorChannels,
    auxColorGates,
    fxtrDepthOn
  ).filter((option) => !unusableOptions.has(option))

  return (
    <Root>
      <IconButton
        size="small"
        title="Add base parameters to this split"
        onClick={(e) => {
          e.preventDefault()
          setIsOpen(true)
        }}
      >
        <AddIcon />
      </IconButton>
      {isOpen && (
        <Popup
          title={
            <PopupTitleRow>
              <span>Add Params</span>
              <AddParamsHelpButton />
            </PopupTitleRow>
          }
          onClose={() => setIsOpen(false)}
        >
          {options.map((option) => {
            const icon = icons[option]
            return (
              <Option
                key={option}
                onClick={(e) => {
                  e.preventDefault()
                  const newParams: Params = {}
                  if (
                    option === 'axis' ||
                    option === 'position' ||
                    option === 'depth'
                  ) {
                    for (const param of paramBundles[option]) {
                      newParams[param] = initialParams[param] ?? 0
                    }
                  } else if (option === 'wwauv') {
                    const initialParamDefaults = initialParams as Params
                    for (const param of paramBundles.wwauv) {
                      if (param === 'white' && !auxColorGates.white) continue
                      if (param === 'warmWhite' && !auxColorGates.warmWhite) continue
                      if (param === 'amber' && !auxColorGates.amber) continue
                      if (param === 'uv' && !auxColorGates.uv) continue
                      newParams[param] = initialParamDefaults[param] ?? 0
                    }
                  } else {
                    const initialParamDefaults = initialParams as Params
                    newParams[option] = initialParamDefaults[option] ?? 0
                  }
                  dispatch(
                    setBaseParams({
                      splitIndex,
                      params: newParams,
                    })
                  )
                  setIsOpen(false)
                }}
              >
                {icon ? icon({}) : null}
                {optionDisplayName(option, mergedSliderLabels)}
              </Option>
            )
          })}
        </Popup>
      )}
    </Root>
  )
}

const Root = styled.div`
  position: relative;
  align-self: center;
`

const Option = styled.div`
  cursor: pointer;
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
  & > * {
    margin-right: 0.5rem;
  }
  :hover {
    font-weight: bold;
  }
`
