import useDragMapped from '../hooks/useDragMapped'
import { useDispatch } from 'react-redux'
import { setBaseParams, incrementBaseParams } from '../redux/controlSlice'
import XYCursor from './XYCursor'
import XYWindow from './XYWindow'
import styled from 'styled-components'

interface Props {
  splitIndex: number | null
}

export default function XYpad({ splitIndex }: Props) {
  const dispatch = useDispatch()

  const [dragContainer, onMouseDown] = useDragMapped(({ x, y, dx, dy }, e) => {
    if (e.metaKey) {
      dispatch(
        incrementBaseParams({
          splitIndex,
          params: {
            width: dx / 2,
            height: dy / 2,
          },
        })
      )
    } else {
      dispatch(
        setBaseParams({
          splitIndex,
          params: {
            x: x,
            y: y,
          },
        })
      )
    }
  })

  const styles: { [key: string]: React.CSSProperties } = {
    root: {},
  }

  return (
    <Root ref={dragContainer} onMouseDown={onMouseDown}>
      <div style={styles.white}>
        <div style={styles.black}></div>
        <XYCursor splitIndex={splitIndex} />
        <XYWindow splitIndex={splitIndex} />
      </div>
    </Root>
  )
}

const Root = styled.div`
  position: relative;
  width: 200px;
  height: 180px;
  background: #000;
  overflow: hidden;
  border: 1px solid ${(props) => props.theme.colors.divider};
`
