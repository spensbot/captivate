import styled from 'styled-components'
import useDragMapped from '../hooks/useDragMapped'
import Cursor from './Cursor'
import { Normalized } from 'math/util'

export interface ColorChannelProps {
  hue: Normalized
  saturation: Normalized
  onChange: (newHue: Normalized, newSaturation: Normalized) => void
}

export default function HSpad({
  hue,
  saturation,
  onChange,
}: ColorChannelProps) {
  const [dragContainer, onMouseDown] = useDragMapped(({ x, y }) => {
    onChange(x, y)
  })

  return (
    <Root
      style={{
        background:
          'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
      }}
      ref={dragContainer}
      onMouseDown={onMouseDown}
    >
      <White>
        <Cursor x={hue} y={saturation} color={'#000'} />
      </White>
    </Root>
  )
}

const Root = styled.div`
  position: relative;
  width: 300px;
  height: 100px;
  overflow: hidden;
`

const White = styled.div`
  position: absolute;
  background: linear-gradient(to top, #fff, #fff0);
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
`
