import useDragMapped from '../hooks/useDragMapped'
import { useDispatch } from 'react-redux'
import { setBaseParams, incrementBaseParams } from '../redux/controlSlice'
import XYCursor from './XYCursor'
import XYWindow from './XYWindow'
import styled from 'styled-components'
import ParamXButton from './ParamXButton'
import { useBaseParam } from 'renderer/redux/store'
import MidiOverlay_xy from '../base/MidiOverlay_xy'
import { paramBundles } from './ParamAddButton'

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

  const x = useBaseParam('x', splitIndex)
  const y = useBaseParam('y', splitIndex)
  const width = useBaseParam('width', splitIndex)
  const height = useBaseParam('height', splitIndex)

  if (
    x === undefined ||
    y === undefined ||
    width === undefined ||
    height === undefined
  ) {
    return null
  }

  return (
    <MidiOverlay_xy
      style={{ marginRight: '1rem' }}
      actions={[
        { type: 'setBaseParam', paramKey: 'x' },
        { type: 'setBaseParam', paramKey: 'y' },
        { type: 'setBaseParam', paramKey: 'width' },
        { type: 'setBaseParam', paramKey: 'height' },
      ]}
    >
      <Root ref={dragContainer} onMouseDown={onMouseDown}>
        <XYCursor splitIndex={splitIndex} />
        <XYWindow splitIndex={splitIndex} />
        <ParamXButton splitIndex={splitIndex} params={paramBundles.position} />
      </Root>
    </MidiOverlay_xy>
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
