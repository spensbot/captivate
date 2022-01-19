import { useDispatch } from 'react-redux'
import { Param } from '../../engine/params'
import { useActiveScene } from '../redux/store'
import { setModulation } from '../redux/scenesSlice'
import useDragMapped from '../hooks/useDragMapped'
import styled from 'styled-components'

export default function ModulationSlider({
  index,
  param,
}: {
  index: number
  param: Param
}) {
  const amount = useActiveScene(
    (activeScene) => activeScene.modulators[index].modulation[param]
  )
  const dispatch = useDispatch()
  const [dragContainer, onMouseDown] = useDragMapped(({ x }) => {
    dispatch(setModulation({ param: param, index: index, value: x }))
  })

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

const Root = styled.div`
  position: relative;
  user-select: none;
  text-align: center;
  background-color: #ffffff08;
  border-bottom: 1px solid #fff1;
  color: #fff7;
  font-size: 0.8rem;
`

const Amount = styled.div`
  background-color: #aaf3;
  position: absolute;
  top: 0;
  bottom: 0;
`
