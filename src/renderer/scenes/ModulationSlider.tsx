import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { DefaultParam } from '../../shared/params'
import {
  useActiveLightScene,
  useBaseParams,
  useDmxSelector,
  useModParam,
} from '../redux/store'
import { setModulation } from '../redux/controlSlice'
import useDragMapped from '../hooks/useDragMapped'
import styled from 'styled-components'
import Popup from 'renderer/base/Popup'
import { indexArray } from 'shared/util'
import { getAllParamKeys } from 'renderer/redux/dmxSlice'

interface Props {
  splitIndex: number
  modIndex: number
  param: DefaultParam | string
}

export default function ModulationSlider({
  splitIndex,
  modIndex,
  param,
}: Props) {
  const modVal = useModParam(param, modIndex, splitIndex)
  const dispatch = useDispatch()
  const [dragContainer, onMouseDown] = useDragMapped(({ x }) => {
    dispatch(setModulation({ splitIndex, param, modIndex, value: x }))
  })

  if (modVal === undefined) {
    return null
  }

  const width = Math.abs(modVal - 0.5)
  const left = modVal > 0.5 ? 0.5 : modVal

  return (
    <Root ref={dragContainer} onMouseDown={onMouseDown}>
      {`Split ${splitIndex + 1} ${param}`}
      <Amount
        style={{
          left: `${left * 100}%`,
          width: `${width * 100}%`,
        }}
      ></Amount>
    </Root>
  )
}

export function AddModulationButton({ modIndex }: { modIndex: number }) {
  const [open, setOpen] = useState(false)

  return (
    <Root
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        if (!e.defaultPrevented) {
          setOpen(true)
        }
      }}
    >
      +
      {open && (
        <Popup title="Add Modulation" onClose={() => setOpen(false)}>
          <AddModulation modIndex={modIndex} />
        </Popup>
      )}
    </Root>
  )
}

function AddModulation({ modIndex }: { modIndex: number }) {
  const numSplits = useActiveLightScene((scene) => scene.splitScenes.length)

  return (
    <AddModRoot>
      {indexArray(numSplits).map((splitIndex) => (
        <ParamsGroup splitIndex={splitIndex} modIndex={modIndex} />
      ))}
    </AddModRoot>
  )
}

const AddModRoot = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
`

function ParamsGroup({
  splitIndex,
  modIndex,
}: {
  splitIndex: number
  modIndex: number
}) {
  const baseParams = useBaseParams(splitIndex)
  const allParamKeys = useDmxSelector((dmx) => getAllParamKeys(dmx))

  return (
    <Group isDefault={false}>
      <GroupHeader>
        {splitIndex === null ? `Default` : `Split ${splitIndex + 1}`}
      </GroupHeader>
      {allParamKeys.map((param) => {
        if (baseParams[param] === undefined) return null
        return (
          <ParamEditor
            key={splitIndex + param + modIndex}
            modIndex={modIndex}
            splitIndex={splitIndex}
            param={param}
          />
        )
      })}
    </Group>
  )
}

function ParamEditor({
  splitIndex,
  modIndex,
  param,
}: {
  splitIndex: number
  modIndex: number
  param: DefaultParam | string
}) {
  const modVal = useModParam(param, modIndex, splitIndex)
  const dispatch = useDispatch()

  return (
    <Item
      onClick={() => {
        if (param)
          dispatch(
            setModulation({
              splitIndex,
              modIndex,
              param,
              value: modVal === undefined ? 0.5 : undefined,
            })
          )
      }}
    >
      {param}
    </Item>
  )
}

const Root = styled.div`
  position: relative;
  user-select: none;
  text-align: center;
  background-color: #ffffff08;
  border-bottom: 1px solid #fff1;
  color: #fff7;
  font-size: 0.8rem;
  cursor: ew-resize;
`

const Amount = styled.div`
  background-color: #aaf3;
  position: absolute;
  top: 0;
  bottom: 0;
`

const Item = styled.div`
  cursor: pointer;
  color: ${(props) => props.theme.colors.text.secondary};
  :hover {
    color: ${(props) => props.theme.colors.text.primary};
  }
`

const GroupHeader = styled.div`
  margin-bottom: 0.2rem;
  font-size: 0.7rem;
  color: ${(props) => props.theme.colors.text.secondary};
  text-decoration: underline;
`

const Group = styled.div<{ isDefault: boolean }>`
  margin: 0 0.5rem;
  border-top: ${(props) =>
    props.isDefault && `1px solid ${props.theme.colors.divider}`};
`
