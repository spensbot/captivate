import IconButton from '@mui/material/IconButton'
import AddIcon from '@mui/icons-material/Add'
import { useState, FunctionComponent } from 'react'
import { useBaseParams, useDmxSelector } from 'renderer/redux/store'
import styled from 'styled-components'
import Popup from '../base/Popup'
import { useDispatch } from 'react-redux'
import {
  DefaultParam,
  Params,
  defaultParamsList,
  paramDisplayName,
} from 'shared/params'
import { setBaseParams } from 'renderer/redux/controlSlice'
import { initParams } from 'shared/params'
import IntensityIcon from '@mui/icons-material/LocalFireDepartment'
import StrobeIcon from '@mui/icons-material/LightMode'
import RandomizeIcon from '@mui/icons-material/Shuffle'
import PositionIcon from '@mui/icons-material/PictureInPicture'
import axisIconSrc from '../../../assets/axis.svg'
import { getAllParamKeys, getCustomChannels } from 'renderer/redux/dmxSlice'

interface Props {
  splitIndex: number
}

type ParamBundle = 'axis' | 'position' | 'depth'
const paramBundleList: ParamBundle[] = ['position', 'depth', 'axis']

export const paramBundles: { [key in ParamBundle]: DefaultParam[] } = {
  axis: ['xAxis', 'yAxis', 'xMirror', 'moverSpread', 'moverMirrorX', 'moverMirrorY', 'moverMode'],
  position: ['x', 'y', 'width', 'height'],
  depth: ['z', 'depth'],
}

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
  option: DefaultParam | ParamBundle | string
): string {
  if (option === 'axis') return 'Pan/Tilt'
  if (option === 'position') return 'Position'
  if (option === 'depth') return 'Z Depth'
  return paramDisplayName(option)
}

function getOptions(
  customChannels: Set<string>,
  baseParams: Params,
  allParamKeys: string[]
): (DefaultParam | ParamBundle | string)[] {
  const defaultParamSet = new Set(defaultParamsList as string[])

  const paramOptions: (DefaultParam | ParamBundle | string)[] =
    defaultParamsList.filter((param) => {
      const isActive = baseParams[param] !== undefined
      const isInBundle = paramBundleList.find((pb) =>
        paramBundles[pb].find((p) => p === param)
      )
      return !isActive && !isInBundle && !(param === 'intensity')
    })

  const paramBundleOptions = paramBundleList.filter((pb) => {
    const isActive = paramBundles[pb].reduce(
      (accum, param) => accum && baseParams[param] !== undefined,
      true
    )
    return !isActive
  })

  const customParamOptions = Array.from(customChannels).filter(
    (option) => baseParams[option] === undefined
  )

  const dynamicParamOptions = allParamKeys.filter(
    (option) =>
      !defaultParamSet.has(option) &&
      !customChannels.has(option) &&
      baseParams[option] === undefined
  )

  return paramOptions
    .concat(paramBundleOptions)
    .concat(customParamOptions)
    .concat(dynamicParamOptions)
}

export default function ParamAddButton({ splitIndex }: Props) {
  const dispatch = useDispatch()
  const [isOpen, setIsOpen] = useState(false)
  const baseParams = useBaseParams(splitIndex)
  const hasAxis = useDmxSelector(
    (dmx) =>
      dmx.fixtureTypes.find(
        (fixtureTypeId) =>
          dmx.fixtureTypesByID[fixtureTypeId].channels.find(
            (channel) => channel.type === 'axis'
          ) !== undefined
      ) !== undefined
  )
  const customChannels = useDmxSelector((dmx) => getCustomChannels(dmx))
  const allParamKeys = useDmxSelector((dmx) => getAllParamKeys(dmx))

  const unusableOptions: Set<DefaultParam | ParamBundle | string> = new Set()
  if (!hasAxis) unusableOptions.add('axis')

  const options = getOptions(customChannels, baseParams, allParamKeys).filter(
    (option) => !unusableOptions.has(option)
  )

  return (
    <Root>
      <IconButton
        size="small"
        onClick={(e) => {
          e.preventDefault()
          setIsOpen(true)
        }}
      >
        <AddIcon />
      </IconButton>
      {isOpen && (
        <Popup title="Add Params" onClose={() => setIsOpen(false)}>
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
                {optionDisplayName(option)}
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
