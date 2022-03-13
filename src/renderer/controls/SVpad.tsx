import styled from 'styled-components'
import useDragMapped from '../hooks/useDragMapped'
import { useDispatch } from 'react-redux'
import { setBaseParams } from '../redux/controlSlice'
import SVCursor from './SVCursor'
import { useOutputParam } from '../redux/realtimeStore'
import ParamXButton from './ParamXButton'
import { Param } from 'shared/params'

interface Props {
  splitIndex: number | null
}

const params: readonly Param[] = ['hue', 'saturation']

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
      {/* <ParamXButton splitIndex={splitIndex} params={['saturation', 'hue']} /> */}
      <SVCursor splitIndex={splitIndex} />
    </Root>
  )
}

const Root = styled.div`
  position: relative;
  width: 200px;
  height: 160px;
  overflow: hidden;
`
