import IconButton from '@mui/material/IconButton'
import AddIcon from '@mui/icons-material/Add'
import { useState, FunctionComponent } from 'react'
import { useBaseParams, useDmxSelector } from 'renderer/redux/store'
import styled from 'styled-components'
import Popup from '../base/Popup'
import { useDispatch } from 'react-redux'
import { Param, Params, paramsList } from 'shared/params'
import { setBaseParams } from 'renderer/redux/controlSlice'
import { defaultOutputParams } from 'shared/params'
import BlackLightIcon from '@mui/icons-material/LightBulb'
import EpicnessIcon from '@mui/icons-material/LocalFireDepartment'
import StrobeIcon from '@mui/icons-material/LightMode'
import RandomizeIcon from '@mui/icons-material/Shuffle'
import PositionIcon from '@mui/icons-material/PictureInPicture'
import axisIconSrc from '../../../assets/axis.svg'

interface Props {
  splitIndex: number | null
}

type ParamBundle = 'axis' | 'position'
const paramBundleList: ParamBundle[] = ['axis', 'position']

export const paramBundles: { [key in ParamBundle]: Param[] } = {
  axis: ['xAxis', 'yAxis', 'xMirror'],
  position: ['x', 'y', 'width', 'height'],
}

function Axis() {
  return <img style={{ width: '1.5rem', height: '1.5rem' }} src={axisIconSrc} />
}

const icons: { [key in ParamBundle | Param]?: FunctionComponent } = {
  black: () => <BlackLightIcon />,
  strobe: () => <StrobeIcon />,
  randomize: () => <RandomizeIcon />,
  position: () => <PositionIcon />,
  intensity: () => <EpicnessIcon />,
  axis: Axis,
}

const defalt = defaultOutputParams()

function getOptions(baseParams: Partial<Params>) {
  const paramOptions: (Param | ParamBundle)[] = paramsList.filter((param) => {
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
  return paramOptions.concat(paramBundleOptions)
}

export default function ParamAddButton({ splitIndex }: Props) {
  const dispatch = useDispatch()
  const [isOpen, setIsOpen] = useState(false)
  const baseParams = useBaseParams(splitIndex)
  const hasBlackLights = useDmxSelector(
    (dmx) =>
      dmx.fixtureTypes.find(
        (ftID) =>
          dmx.fixtureTypesByID[ftID].channels.find(
            (ch) => ch.type === 'color' && ch.color === 'black'
          ) !== undefined
      ) !== undefined
  )
  const hasAxis = useDmxSelector(
    (dmx) =>
      dmx.fixtureTypes.find(
        (ftID) =>
          dmx.fixtureTypesByID[ftID].channels.find(
            (ch) => ch.type === 'axis'
          ) !== undefined
      ) !== undefined
  )

  const unuseableOptions: Set<Param | ParamBundle> = new Set()
  if (!hasBlackLights) unuseableOptions.add('black')
  if (!hasAxis) unuseableOptions.add('axis')
  const options = getOptions(baseParams).filter(
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
                onClick={(e) => {
                  e.preventDefault()
                  const newParams: Partial<Params> = {}
                  if (option === 'axis' || option === 'position') {
                    for (const param of paramBundles[option]) {
                      newParams[param] = defalt[param]
                    }
                  } else {
                    newParams[option] = defalt[option]
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
