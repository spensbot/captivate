import useDragMapped from '../hooks/useDragMapped'
import { useDispatch } from 'react-redux'
import { setBaseParams, incrementBaseParams } from '../redux/controlSlice'
import { XYCursorBase, XYCursorOutput } from './XYCursor'
import XYWindow from './XYWindow'
import styled from 'styled-components'
import ParamXButton from './ParamXButton'
import { useBaseParam } from 'renderer/redux/store'
import MidiOverlay_xy from '../base/MidiOverlay_xy'
import { paramBundles } from './ParamAddButton'
import { secondaryEnabled } from 'renderer/base/keyUtil'

interface Props {
  splitIndex: number
}

export default function XYpad({ splitIndex }: Props) {
  const dispatch = useDispatch()

  const [dragContainer, onMouseDown] = useDragMapped(({ x, y, dx, dy }, e) => {
    if (secondaryEnabled(e)) {
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

  const content = (
    <Root ref={dragContainer} onMouseDown={onMouseDown}>
      <XYCursorOutput splitIndex={splitIndex} />
      <XYCursorBase splitIndex={splitIndex} />
      <XYWindow splitIndex={splitIndex} />
      <ParamXButton splitIndex={splitIndex} params={paramBundles.position} />
    </Root>
  )

  return splitIndex === 0 ? (
    <MidiOverlay_xy
      style={{ marginRight: '1rem' }}
      actions={[
        { type: 'setBaseParam', paramKey: 'x' },
        { type: 'setBaseParam', paramKey: 'y' },
        { type: 'setBaseParam', paramKey: 'width' },
        { type: 'setBaseParam', paramKey: 'height' },
      ]}
    >
      {content}
    </MidiOverlay_xy>
  ) : (
    content
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
