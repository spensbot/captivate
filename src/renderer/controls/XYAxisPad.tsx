import { useEffect, useState } from 'react'
import useDragMapped from '../hooks/useDragMapped'
import { useDispatch } from 'react-redux'
import { setBaseParams } from '../redux/controlSlice'
import XYAxisCursor from './XYAxisCursor'
import styled from 'styled-components'
import { useBaseParam } from 'renderer/redux/store'
import ParamXButton from './ParamXButton'
import { paramBundles } from './ParamAddButton'

interface Props {
  splitIndex: number
}

const MOVER_MODE_FOLLOW = 0
const MOVER_MODE_TANDEM = 1
const MOVER_MODE_MIRROR = 2

function normalizeMoverMode(value: number): number {
  const rounded = Math.round(value)
  if (rounded < MOVER_MODE_FOLLOW || rounded > MOVER_MODE_MIRROR) {
    return MOVER_MODE_FOLLOW
  }
  return rounded
}

function moverModeLabel(mode: number): string {
  if (mode === MOVER_MODE_TANDEM) return 'Tandem'
  if (mode === MOVER_MODE_MIRROR) return 'Mirror'
  return 'Follow'
}

export default function XYAxispad({ splitIndex }: Props) {
  const dispatch = useDispatch()
  const [controlsExpanded, setControlsExpanded] = useState(false)

  const [dragContainer, onMouseDown] = useDragMapped(({ x, y }) => {
    dispatch(
      setBaseParams({
        splitIndex,
        params: {
          xAxis: x,
          yAxis: y,
        },
      })
    )
  })

  const xAxis = useBaseParam('xAxis', splitIndex)
  const yAxis = useBaseParam('yAxis', splitIndex)
  const xMirror = useBaseParam('xMirror', splitIndex)
  const moverSpread = useBaseParam('moverSpread', splitIndex)
  const moverMirrorX = useBaseParam('moverMirrorX', splitIndex)
  const moverMirrorY = useBaseParam('moverMirrorY', splitIndex)
  const moverModeRaw = useBaseParam('moverMode', splitIndex)

  useEffect(() => {
    if (xAxis === undefined || yAxis === undefined || xMirror === undefined) {
      return
    }

    const nextParams: { [key: string]: number } = {}
    if (moverSpread === undefined) nextParams.moverSpread = 0
    if (moverMirrorX === undefined) nextParams.moverMirrorX = 0
    if (moverMirrorY === undefined) nextParams.moverMirrorY = 0
    if (moverModeRaw === undefined) nextParams.moverMode = MOVER_MODE_FOLLOW

    if (Object.keys(nextParams).length > 0) {
      dispatch(
        setBaseParams({
          splitIndex,
          params: nextParams,
        })
      )
    }
  }, [
    dispatch,
    moverMirrorX,
    moverMirrorY,
    moverModeRaw,
    moverSpread,
    splitIndex,
    xAxis,
    xMirror,
    yAxis,
  ])

  if (
    xAxis === undefined ||
    yAxis === undefined ||
    xMirror === undefined ||
    moverSpread === undefined ||
    moverMirrorX === undefined ||
    moverMirrorY === undefined ||
    moverModeRaw === undefined
  ) {
    return null
  }

  const moverMode = normalizeMoverMode(moverModeRaw)

  return (
    <Root ref={dragContainer} onMouseDown={onMouseDown}>
      <XYAxisCursor splitIndex={splitIndex} />
      <MirroredButton
        active={xMirror > 0.5}
        title="Legacy Pan mirror based on fixture X position"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          dispatch(
            setBaseParams({
              splitIndex,
              params: { xMirror: xMirror > 0.5 ? 0 : 1 },
            })
          )
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        pan mirror
      </MirroredButton>

      <MoverControls
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <ControlsHeader>
          <ControlLabel>Mover Pattern: {moverModeLabel(moverMode)}</ControlLabel>
          <CollapseButton
            type="button"
            title={controlsExpanded ? 'Collapse mover controls' : 'Expand mover controls'}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setControlsExpanded((current) => !current)
            }}
          >
            {controlsExpanded ? 'Hide' : 'Show'}
          </CollapseButton>
        </ControlsHeader>

        {controlsExpanded && (
          <>
            <ModeRow>
              <ModeButton
                type="button"
                active={moverMode === MOVER_MODE_FOLLOW}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => {
                  dispatch(
                    setBaseParams({
                      splitIndex,
                      params: { moverMode: MOVER_MODE_FOLLOW },
                    })
                  )
                }}
                title="All movers in the group track one shared point in the bound area"
              >
                Follow
              </ModeButton>
              <ModeButton
                type="button"
                active={moverMode === MOVER_MODE_TANDEM}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => {
                  dispatch(
                    setBaseParams({
                      splitIndex,
                      params: { moverMode: MOVER_MODE_TANDEM },
                    })
                  )
                }}
                title="Movers spread around the shared point by distance"
              >
                Tandem
              </ModeButton>
              <ModeButton
                type="button"
                active={moverMode === MOVER_MODE_MIRROR}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => {
                  dispatch(
                    setBaseParams({
                      splitIndex,
                      params: { moverMode: MOVER_MODE_MIRROR },
                    })
                  )
                }}
                title="Movers mirror the shared point by left/right and top/bottom"
              >
                Mirror
              </ModeButton>
            </ModeRow>

            {moverMode === MOVER_MODE_TANDEM && (
              <>
                <ControlLabel>Tandem Distance</ControlLabel>
                <SpreadInput
                  type="range"
                  title="Controls mover spacing in tandem mode"
                  min={0}
                  max={1}
                  step={0.01}
                  value={moverSpread}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(event) => {
                    dispatch(
                      setBaseParams({
                        splitIndex,
                        params: { moverSpread: Number(event.target.value) },
                      })
                    )
                  }}
                />
              </>
            )}

            {moverMode === MOVER_MODE_MIRROR && (
              <>
                <ControlLabel>Mirror Axes</ControlLabel>
                <ToggleRow>
                  <ToggleButton
                    type="button"
                    active={moverMirrorX > 0.5}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      dispatch(
                        setBaseParams({
                          splitIndex,
                          params: { moverMirrorX: moverMirrorX > 0.5 ? 0 : 1 },
                        })
                      )
                    }}
                    title="Mirror movers on left/right sides of the group"
                  >
                    Mirror L/R
                  </ToggleButton>
                  <ToggleButton
                    type="button"
                    active={moverMirrorY > 0.5}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      dispatch(
                        setBaseParams({
                          splitIndex,
                          params: { moverMirrorY: moverMirrorY > 0.5 ? 0 : 1 },
                        })
                      )
                    }}
                    title="Mirror movers on top/bottom sides of the group"
                  >
                    Mirror T/B
                  </ToggleButton>
                </ToggleRow>
              </>
            )}
          </>
        )}
      </MoverControls>

      <ParamXButton splitIndex={splitIndex} params={paramBundles.axis} />
    </Root>
  )
}

const Root = styled.div`
  position: relative;
  min-width: 200px;
  height: 180px;
  background: #000;
  overflow: hidden;
  border: 1px solid ${(props) => props.theme.colors.divider};
  margin-right: 1rem;
`

const MirroredButton = styled.div<{ active: boolean }>`
  position: absolute;
  cursor: pointer;
  top: 0rem;
  left: 0rem;
  padding: 0.4rem;
  background-color: #0009;
  color: ${(props) =>
    props.active
      ? props.theme.colors.text.primary
      : props.theme.colors.text.secondary};
  :hover {
    text-decoration: underline;
  }
`

const MoverControls = styled.div`
  position: absolute;
  left: 0.35rem;
  bottom: 0.35rem;
  right: 0.35rem;
  background: #000b;
  border: 1px solid #ffffff22;
  border-radius: 0.35rem;
  padding: 0.25rem 0.35rem;
`

const ControlsHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
`

const CollapseButton = styled.button`
  border: 1px solid #ffffff44;
  background: #0008;
  color: #ddd;
  font-size: 0.6rem;
  border-radius: 0.28rem;
  cursor: pointer;
  padding: 0.12rem 0.35rem;
`

const ControlLabel = styled.div`
  font-size: 0.62rem;
  color: ${(props) => props.theme.colors.text.secondary};
  margin-bottom: 0.15rem;
  margin-top: 0.2rem;
`

const ModeRow = styled.div`
  display: flex;
  gap: 0.25rem;
  margin-bottom: 0.15rem;
`

const SpreadInput = styled.input`
  width: 100%;
  margin: 0;
`

const ToggleRow = styled.div`
  margin-top: 0.1rem;
  display: flex;
  gap: 0.25rem;
`

const ModeButton = styled.button<{ active: boolean }>`
  border: 1px solid ${(props) => (props.active ? '#fff8' : '#6668')};
  background: ${(props) => (props.active ? '#ffffff24' : '#0008')};
  color: ${(props) => (props.active ? '#fff' : '#ccc')};
  font-size: 0.6rem;
  border-radius: 0.28rem;
  cursor: pointer;
  padding: 0.14rem 0.32rem;
`

const ToggleButton = styled.button<{ active: boolean }>`
  border: 1px solid ${(props) => (props.active ? '#fff8' : '#6668')};
  background: ${(props) => (props.active ? '#ffffff24' : '#0008')};
  color: ${(props) => (props.active ? '#fff' : '#ccc')};
  font-size: 0.62rem;
  border-radius: 0.28rem;
  cursor: pointer;
  padding: 0.14rem 0.32rem;
`
