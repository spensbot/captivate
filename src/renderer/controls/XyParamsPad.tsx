import useDragMapped from '../hooks/useDragMapped'
import { useDispatch } from 'react-redux'
import { setBaseParams, incrementBaseParams } from '../redux/controlSlice'
import { XYCursorBase, XYCursorOutput } from './XYCursor'
import styled from 'styled-components'
import ParamXButton from './ParamXButton'
import { useBaseParam } from 'renderer/redux/store'
import MidiOverlay_xy from '../base/MidiOverlay_xy'
import { paramBundles } from './ParamAddButton'
import { secondaryEnabled } from 'renderer/base/keyUtil'
import { useOutputParam } from '../redux/realtimeStore'
import Window2D from '../base/Window2D'
import SplitDimensionSlider from './SplitDimensionSlider'

interface Props {
  splitIndex: number
}

const XY_CENTER_DETENT_RADIUS = 0.04

function applyCenterDetent(value: number): number {
  return Math.abs(value - 0.5) <= XY_CENTER_DETENT_RADIUS ? 0.5 : value
}

export default function XyParamsPad({ splitIndex }: Props) {
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
            x: applyCenterDetent(x),
            y: applyCenterDetent(y),
          },
        })
      )
    }
  })

  const x = useBaseParam('x', splitIndex)
  const y = useBaseParam('y', splitIndex)
  const width = useBaseParam('width', splitIndex)
  const height = useBaseParam('height', splitIndex)
  const xOut = useOutputParam('x', splitIndex)
  const yOut = useOutputParam('y', splitIndex)
  const widthOut = useOutputParam('width', splitIndex)
  const heightOut = useOutputParam('height', splitIndex)

  if (
    x === undefined ||
    y === undefined ||
    width === undefined ||
    height === undefined
  ) {
    return null
  }

  const content = (
    <Root>
      <ParamToolbar>
        <ParamXButton
          placement="toolbar"
          splitIndex={splitIndex}
          params={paramBundles.position}
        />
      </ParamToolbar>
      <ParamBodyRow>
        <PadColumn>
          <PlotArea ref={dragContainer} onMouseDown={onMouseDown}>
            <CenterMarker aria-hidden />
            <XYCursorOutput splitIndex={splitIndex} />
            <XYCursorBase splitIndex={splitIndex} />
            <Window2D
              window2D={{
                x: {
                  pos: xOut,
                  width: widthOut,
                },
                y: {
                  pos: yOut,
                  width: heightOut,
                },
              }}
            />
          </PlotArea>
        </PadColumn>
        <SizeControls
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <SizeRack>
            <SplitDimensionSlider
              param="width"
              splitIndex={splitIndex}
              label="Width"
              title="Width of X movement window"
            />
            <SplitDimensionSlider
              param="height"
              splitIndex={splitIndex}
              label="Height"
              title="Height of Y movement window"
            />
          </SizeRack>
        </SizeControls>
      </ParamBodyRow>
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
  width: max-content;
  min-width: 200px;
  height: 180px;
  margin-right: 1rem;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  overflow: visible;
`

const ParamToolbar = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1.05rem;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.12rem;
  z-index: 20;
  pointer-events: none;

  & > * {
    pointer-events: auto;
  }
`

const ParamBodyRow = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  padding-top: 1.08rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0.42rem;
`

const PadColumn = styled.div`
  position: relative;
  width: 200px;
  min-width: 200px;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  flex-shrink: 0;
`

const PlotArea = styled.div`
  position: relative;
  width: 200px;
  min-width: 200px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #000;
  border: 1px solid ${(props) => props.theme.colors.divider};
`

const CenterMarker = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0.9rem;
  height: 0.9rem;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  border: 1px solid #ffffff6a;
  background: radial-gradient(circle at center, #ffffff55 0 22%, #ffffff05 58%, #0000 100%);
  pointer-events: none;
  z-index: 0;

  &::before,
  &::after {
    content: '';
    position: absolute;
    background: #ffffff5a;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }

  &::before {
    width: 0.04rem;
    height: 1.1rem;
  }

  &::after {
    width: 1.1rem;
    height: 0.04rem;
  }
`

const SizeControls = styled.div`
  position: relative;
  width: 3.9rem;
  min-width: 3.9rem;
  height: 100%;
  min-height: 0;
  padding: 0.1rem 0.2rem;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 0.3rem;
  background: rgba(0, 0, 0, 0.62);
  display: flex;
  align-items: stretch;
  justify-content: center;
  z-index: 1;
`

const SizeRack = styled.div`
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 0.2rem;
  width: 100%;
  height: 100%;
`
