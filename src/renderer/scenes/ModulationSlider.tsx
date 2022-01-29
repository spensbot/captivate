import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { Param, paramsList } from '../../engine/params'
import { useActiveLightScene } from '../redux/store'
import { setModulation } from '../redux/controlSlice'
import useDragMapped from '../hooks/useDragMapped'
import styled from 'styled-components'
import Popup from 'renderer/base/Popup'

interface Props {
  index: number
  param: Param
}

export default function ModulationSlider({ index, param }: Props) {
  const amount = useActiveLightScene(
    (activeScene) => activeScene.modulators[index].modulation[param]
  )
  const dispatch = useDispatch()
  const [dragContainer, onMouseDown] = useDragMapped(({ x }) => {
    dispatch(setModulation({ param: param, index: index, value: x }))
  })

  if (amount === undefined) {
    return null
  }

  const width = Math.abs(amount - 0.5)
  const left = amount > 0.5 ? 0.5 : amount

  return (
    <Root ref={dragContainer} onMouseDown={onMouseDown}>
      {param}
      <Amount
        style={{
          left: `${left * 100}%`,
          width: `${width * 100}%`,
        }}
      ></Amount>
    </Root>
  )
}

export function AddModulationButton({ index }: { index: number }) {
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
          {paramsList.map((param) => (
            <ParamEditor key={param + index} index={index} param={param} />
          ))}
        </Popup>
      )}
    </Root>
  )
}

function ParamEditor({ index, param }: { index: number; param: Param }) {
  const modVal = useActiveLightScene(
    (scene) => scene.modulators[index].modulation[param]
  )
  const dispatch = useDispatch()

  return (
    <Item
      onClick={() => {
        if (param)
          dispatch(
            setModulation({
              index: index,
              param: param,
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
