import IconButton from '@mui/material/IconButton'
import AddIcon from '@mui/icons-material/Add'
import { useState, FunctionComponent } from 'react'
import { useBaseParams, useDmxSelector } from 'renderer/redux/store'
import styled from 'styled-components'
import Popup from '../../../ui/react/base/Popup'
import { useDispatch } from 'react-redux'
import { DefaultParam, Params, defaultParamsList } from 'shared/params'
import { setBaseParams } from 'renderer/redux/controlSlice'
import { initParams } from 'shared/params'
import IntensityIcon from '@mui/icons-material/LocalFireDepartment'
import StrobeIcon from '@mui/icons-material/LightMode'
import RandomizeIcon from '@mui/icons-material/Shuffle'
import PositionIcon from '@mui/icons-material/PictureInPicture'
import axisIconSrc from '../../../assets/axis.svg'
import { getCustomChannels } from 'features/dmx/redux/dmxSlice'

interface Props {
  splitIndex: number
}

type ParamBundle = 'axis' | 'position'
const paramBundleList: ParamBundle[] = ['position', 'axis']

export const paramBundles: { [key in ParamBundle]: DefaultParam[] } = {
  axis: ['xAxis', 'yAxis', 'xMirror'],
  position: ['x', 'y', 'width', 'height'],
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
  intensity: () => <IntensityIcon />,
  axis: Axis,
}

const initialParams = initParams()

function getOptions(
  custom_channels: Set<string>,
  baseParams: Params
): (DefaultParam | ParamBundle | string)[] {
  const paramOptions: (DefaultParam | ParamBundle | string)[] =
    defaultParamsList.filter((param) => {
      const isActive = baseParams[param] !== undefined
      const isInBundle = paramBundleList.find((pb) =>
        paramBundles[pb].find((p) => p === param)
      )
      return !isActive && !isInBundle
    })
  const paramBundleOptions = paramBundleList.filter((pb) => {
    const isActive = paramBundles[pb].reduce(
      (accum, param) => accum && baseParams[param] !== undefined,
      true
    )
    return !isActive
  })
  const customParamOptions = Array.from(custom_channels).filter(
    (cpo) => baseParams[cpo] === undefined
  )

  return paramOptions.concat(paramBundleOptions).concat(customParamOptions)
}

export default function ParamAddButton({ splitIndex }: Props) {
  const dispatch = useDispatch()
  const [isOpen, setIsOpen] = useState(false)
  const baseParams = useBaseParams(splitIndex)
  const hasAxis = useDmxSelector(
    (dmx) =>
      dmx.fixtureTypes.find(
        (ftID) =>
          dmx.fixtureTypesByID[ftID].channels.find(
            (ch) => ch.type === 'axis'
          ) !== undefined
      ) !== undefined
  )
  const customChannels = useDmxSelector((dmx) => getCustomChannels(dmx))

  const unuseableOptions: Set<DefaultParam | ParamBundle | string> = new Set()
  if (!hasAxis) unuseableOptions.add('axis')
  const options = getOptions(customChannels, baseParams).filter(
    (option) => !unuseableOptions.has(option)
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
                  if (option === 'axis' || option === 'position') {
                    for (const param of paramBundles[option]) {
                      newParams[param] = initialParams[param] ?? 0
                    }
                  } else {
                    let _initialParams = initialParams as Params
                    newParams[option] = _initialParams[option] ?? 0
                  }
                  dispatch(
                    setBaseParams({
                      splitIndex,
                      params: newParams,
                    })
                  )
                }}
              >
                {icon ? icon({}) : null}
                {option}
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
