import styled from 'styled-components'
import useDragMapped from '../../../ui/react/hooks/useDragMapped'
import { useDispatch } from 'react-redux'
import { setBaseParams } from '../../../../renderer/redux/controlSlice'
import { SVCursorBase, SVCursorOutput } from './SVCursor'
import { useOutputParam } from 'features/params/redux'

interface Props {
  splitIndex: number
}

export default function SVpad({ splitIndex }: Props) {
  const hue = useOutputParam('hue', splitIndex)
  const dispatch = useDispatch()

  const [dragContainer, onMouseDown] = useDragMapped(({ x, y }) => {
    dispatch(
      setBaseParams({
        splitIndex,
        params: {
          saturation: x,
          brightness: y,
        },
      })
    )
  })

  return (
    <Root
      style={{ background: `hsl(${hue * 360},100%, 50%)` }}
      ref={dragContainer}
      onMouseDown={onMouseDown}
    >
      <White>
        <Black />
        {/* <ParamXButton splitIndex={splitIndex} params={['saturation', 'hue']} /> */}
        <SVCursorOutput splitIndex={splitIndex} />
        <SVCursorBase splitIndex={splitIndex} />
      </White>
    </Root>
  )
}

const Root = styled.div`
  position: relative;
  width: 200px;
  height: 160px;
  overflow: hidden;
`

const White = styled.div`
  position: absolute;
  background: linear-gradient(to right, #fff, rgba(255, 255, 255, 0));
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
`
const Black = styled.div`
  position: absolute;
  background: linear-gradient(to top, #000, rgba(0, 0, 0, 0));
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
`
