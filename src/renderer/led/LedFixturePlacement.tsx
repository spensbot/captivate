import styled from 'styled-components'
import Cursor from 'renderer/base/Cursor'
import useDragMapped from 'renderer/hooks/useDragMapped'

interface Props {}

export default function LedFixturePlacement({}: Props) {
  useDragMapped((pos, e) => {})

  return (
    <Root>
      <Background>
        <Vertical />
        <Horizontal />
        <Cursor x={0.25} y={0.25} />
      </Background>
    </Root>
  )
}

const Root = styled.div`
  padding: 1rem;
  height: 100%;
  box-sizing: border-box;
`

const Background = styled.div`
  height: 100%;
  position: relative;
  background-color: #111;
`

const Vertical = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background-color: #fff3;
`

const Horizontal = styled.div`
  position: absolute;
  top: 50%;
  height: 1px;
  left: 0;
  right: 0;
  background-color: #fff3;
`
