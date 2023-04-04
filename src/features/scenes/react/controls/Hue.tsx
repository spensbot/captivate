import useDragMapped from '../../../ui/react/hooks/useDragMapped'
import { useDispatch } from 'react-redux'
import { setBaseParams } from '../../../../renderer/redux/controlSlice'
import styled from 'styled-components'
import { useBaseParam } from 'renderer/redux/store'

interface Props {
  splitIndex: number
}

export default function Hue({ splitIndex }: Props) {
  const dispatch = useDispatch()

  const [dragContainer, onMouseDown] = useDragMapped(({ x }) => {
    dispatch(
      setBaseParams({
        splitIndex,
        params: { hue: x },
      })
    )
  })

  const hue = useBaseParam('hue', splitIndex) ?? 0

  return (
    <Root ref={dragContainer} onMouseDown={onMouseDown}>
      <Cursor style={{ left: `${hue * 100}%` }} />
    </Root>
  )
}

const Root = styled.div`
  width: 100%;
  height: 20px;
  position: relative;
  background: linear-gradient(
    to right,
    #f00 0%,
    #ff0 17%,
    #0f0 33%,
    #0ff 50%,
    #00f 67%,
    #f0f 83%,
    #f00 100%
  );
`

const Cursor = styled.div`
  width: 0.5rem;
  border: 1.5px solid white;
  border-radius: 4px;
  position: absolute;
  top: -4px;
  bottom: -4px;
  transform: translate(-0.25rem, 0);
  box-sizing: border-box;
`
