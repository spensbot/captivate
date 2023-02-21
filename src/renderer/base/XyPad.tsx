import useDragMapped from '../hooks/useDragMapped'
import styled from 'styled-components'
import Cursor from './Cursor'

interface Props {
  x: number
  y: number
  onChange: (x: number, y: number) => void
}

export default function XyPad({ x, y, onChange }: Props) {
  const [dragContainer, onMouseDown] = useDragMapped((pos) => {
    onChange(pos.x, pos.y)
  })

  return (
    <Root ref={dragContainer} onMouseDown={onMouseDown}>
      <Vert />
      <Hor />
      <Cursor x={x} y={y} />
    </Root>
  )
}

const Root = styled.div`
  position: relative;
  width: 200px;
  height: 100px;
  background: #000;
  overflow: hidden;
  border: 1px solid ${(props) => props.theme.colors.divider};
`

const Vert = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background-color: #fff3;
`

const Hor = styled.div`
  position: absolute;
  top: 50%;
  height: 1px;
  left: 0;
  right: 0;
  background-color: #fff3;
`
