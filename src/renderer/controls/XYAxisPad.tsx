import useDragMapped from '../hooks/useDragMapped'
import { useDispatch } from 'react-redux'
import { setBaseParams } from '../redux/controlSlice'
import XYAxisCursor from './XYAxisCursor'
import styled from 'styled-components'

interface Props {
  splitIndex: number | null
}

export default function XYAxispad({ splitIndex }: Props) {
  const dispatch = useDispatch()

  const [dragContainer, onMouseDown] = useDragMapped(({ x, y }) => {
    dispatch(
      setBaseParams({
        splitIndex,
        params: {
          xAxis: x,
          yAxis: y,
        },
      })
    )
  })

  return (
    <Root ref={dragContainer} onMouseDown={onMouseDown}>
      <div>
        <div></div>
        <XYAxisCursor splitIndex={splitIndex} />
      </div>
    </Root>
  )
}

const Root = styled.div`
  position: relative;
  min-width: 200px;
  height: 180px;
  background: #000;
  overflow: hidden;
  border: 1px solid ${(props) => props.theme.colors.divider};
`
