import IconButton from '@mui/material/IconButton'
import AddIcon from '@mui/icons-material/Add'
import { useState } from 'react'
import { useBaseParams, useDmxSelector } from 'renderer/redux/store'
import styled from 'styled-components'
import Popup from '../base/Popup'
import { useDispatch } from 'react-redux'
import { Param, Params, paramsList } from 'shared/params'
import { setBaseParams } from 'renderer/redux/controlSlice'
import { defaultOutputParams } from 'shared/params'

interface Props {
  splitIndex: number | null
}

type ParamBundle = 'axis' | 'position'
const paramBundleList: ParamBundle[] = ['axis', 'position']

export const paramBundles: { [key in ParamBundle]: Param[] } = {
  axis: ['xAxis', 'yAxis', 'xMirror'],
  position: ['x', 'y', 'width', 'height'],
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

  const options = getOptions(baseParams)

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
          {options.map((option) => (
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
              {option}
            </Option>
          ))}
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
  :hover {
    font-weight: bold;
  }
`
