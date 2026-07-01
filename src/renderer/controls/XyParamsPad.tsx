import { useEffect } from 'react'
import type { CSSProperties } from 'react'
import useDragMapped from '../hooks/useDragMapped'
import { useDispatch } from 'react-redux'
import { setBaseParams, incrementBaseParams } from '../redux/controlSlice'
import { XYCursorBase, XYCursorOutput } from './XYCursor'
import styled from 'styled-components'
import ParamXButton from './ParamXButton'
import ParamSlider from './ParamSlider'
import { useBaseParam } from 'renderer/redux/store'
import MidiOverlay_xy from '../base/MidiOverlay_xy'
import { makeSetBaseParamAction } from '../redux/deviceState'
import { paramBundles } from './ParamAddButton'
import { initParams } from '../../shared/params'
import { secondaryEnabled } from 'renderer/base/keyUtil'
import { useOutputParam, useRealtimeSelector } from '../redux/realtimeStore'
import Window2D from '../base/Window2D'

interface Props {
  splitIndex: number
}

const XY_CENTER_DETENT_RADIUS = 0.04

/** Match XY pad height; same spacing as white / amber / UV sliders. */
const positionDimSliderStyle: CSSProperties = {
  height: '180px',
  minHeight: '180px',
  marginRight: '0.35rem',
}

const positionDimSliderLastStyle: CSSProperties = {
  height: '180px',
  minHeight: '180px',
  marginRight: '0.85rem',
}

function applyCenterDetent(value: number): number {
  return Math.abs(value - 0.5) <= XY_CENTER_DETENT_RADIUS ? 0.5 : value
}

export default function XyParamsPad({ splitIndex }: Props) {
  const dispatch = useDispatch()

  const [dragContainer, onPointerDown] = useDragMapped(({ x, y, dx, dy }, e) => {
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
  const positionFeather = useBaseParam('positionFeather', splitIndex)
  const featherOut = useRealtimeSelector((state) => {
    const modulated = state.splitStates[splitIndex]?.outputParams?.positionFeather
    if (modulated !== undefined) return modulated
    return positionFeather ?? 0
  })

  useEffect(() => {
    if (x === undefined || y === undefined) {
      return
    }
    const defaults = initParams()
    const missing: Record<string, number> = {}
    if (width === undefined) {
      missing.width = defaults.width
    }
    if (height === undefined) {
      missing.height = defaults.height
    }
    if (positionFeather === undefined) {
      missing.positionFeather = defaults.positionFeather
    }
    if (Object.keys(missing).length > 0) {
      dispatch(setBaseParams({ splitIndex, params: missing }))
    }
  }, [dispatch, height, positionFeather, splitIndex, width, x, y])

  if (x === undefined || y === undefined) {
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
      <PadRow>
        <MidiOverlay_xy
          splitIndex={splitIndex}
          labels={['X', 'Y']}
          style={{ width: '200px', minWidth: '200px', height: '100%', flexShrink: 0 }}
          actions={[
            makeSetBaseParamAction(splitIndex, 'x'),
            makeSetBaseParamAction(splitIndex, 'y'),
          ]}
        >
          <PlotArea ref={dragContainer} onPointerDown={onPointerDown}>
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
              feather={featherOut}
            />
          </PlotArea>
        </MidiOverlay_xy>
        <ParamSlider
          param="width"
          splitIndex={splitIndex}
          hideRemoveButton
          label="Width"
          wrapperStyle={positionDimSliderStyle}
        />
        <ParamSlider
          param="height"
          splitIndex={splitIndex}
          hideRemoveButton
          label="Height"
          wrapperStyle={positionDimSliderStyle}
        />
        <ParamSlider
          param="positionFeather"
          splitIndex={splitIndex}
          hideRemoveButton
          label="Feather"
          wrapperStyle={positionDimSliderLastStyle}
        />
      </PadRow>
    </Root>
  )

  return content
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
  top: -0.42rem;
  right: calc(-0.72rem - 10px);
  left: auto;
  height: auto;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0;
  z-index: 20;
  pointer-events: auto;
`

const PadRow = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: row;
  align-items: stretch;
`

const PlotArea = styled.div`
  position: relative;
  width: 200px;
  min-width: 200px;
  height: 100%;
  min-height: 0;
  flex-shrink: 0;
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
