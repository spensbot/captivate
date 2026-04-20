import { useState } from 'react'
import styled from 'styled-components'
import { useDispatch } from 'react-redux'
import useDragMapped from '../hooks/useDragMapped'
import { incrementBaseParams, setBaseParams } from '../redux/controlSlice'
import { useBaseParam, useDmxSelector } from '../redux/store'
import { useOutputParam } from '../redux/realtimeStore'
import { STAGE_SNAP_GRID_FEET, snapStageAxisNormalized } from '../../shared/stage'
import { secondaryEnabled } from '../base/keyUtil'
import Cursor from '../base/Cursor'
import ParamXButton from './ParamXButton'
import { paramBundles } from './ParamAddButton'
import SplitDimensionSlider from './SplitDimensionSlider'

interface Props {
  splitIndex: number
}

type ZCenterMode = 'stage' | 'dance'

const Z_DEPTH_CENTER_PARAM = 'zCenterReference'

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function axisPosZ(value: number | undefined): number {
  if (value !== undefined) return clamp01(value)
  return 0
}

function axisWidthZ(value: number | undefined): number {
  if (value !== undefined) return value
  return 1
}

function zCenterModeFromValue(value: number | undefined): ZCenterMode {
  return value !== undefined && value > 0.5 ? 'dance' : 'stage'
}

function zCenterModeValue(mode: ZCenterMode): number {
  return mode === 'dance' ? 1 : 0
}

function zCenterPreset(mode: ZCenterMode): number {
  // Stage reference keeps Z anchored at the stage edge.
  // Dance reference centers Z in the middle of the dance floor.
  return mode === 'dance' ? 0.5 : 0
}

function ZWindow({
  z,
  depth,
  centerMode,
}: {
  z: number
  depth: number
  centerMode: ZCenterMode
}) {
  const safeZ = clamp01(z)
  const safeDepth = clamp01(depth)
  const left =
    centerMode === 'dance' ? safeZ - safeDepth / 2 : safeZ
  const width =
    centerMode === 'dance' ? safeDepth : clamp01(safeZ + safeDepth) - safeZ

  return (
    <WindowRoot
      style={{
        left: `${left * 100}%`,
        width: `${width * 100}%`,
      }}
    />
  )
}

export default function ZParamsPad({ splitIndex }: Props) {
  const dispatch = useDispatch()
  const stage = useDmxSelector((state) => state.stage)
  const [centerMenuOpen, setCenterMenuOpen] = useState(false)

  const z = useBaseParam('z', splitIndex)
  const depth = useBaseParam('depth', splitIndex)
  const zCenterModeRaw = useBaseParam(Z_DEPTH_CENTER_PARAM, splitIndex)

  const outZ = useOutputParam('z', splitIndex)
  const outDepth = useOutputParam('depth', splitIndex)

  const isEnabled = z !== undefined && depth !== undefined
  const baseZ = axisPosZ(z)
  const outputZ = axisPosZ(outZ)
  const outputDepth = axisWidthZ(outDepth)

  const centerMode = zCenterModeFromValue(zCenterModeRaw)

  function applyCenterMode(mode: ZCenterMode) {
    dispatch(
      setBaseParams({
        splitIndex,
        params: {
          [Z_DEPTH_CENTER_PARAM]: zCenterModeValue(mode),
          z: zCenterPreset(mode),
        },
      })
    )
    setCenterMenuOpen(false)
  }

  const [dragContainer, onMouseDown] = useDragMapped(({ x, dx }, e) => {
    if (!isEnabled) {
      return
    }

    if (secondaryEnabled(e)) {
      dispatch(
        incrementBaseParams({
          splitIndex,
          params: {
            depth: dx / 2,
          },
        })
      )
      return
    }

    dispatch(
      setBaseParams({
        splitIndex,
        params: {
          z: snapStageAxisNormalized(stage, 'z', x, STAGE_SNAP_GRID_FEET),
        },
      })
    )
  })

  if (!isEnabled) {
    return null
  }

  return (
    <Root>
      <ParamToolbar>
        <ParamXButton
          placement="toolbar"
          splitIndex={splitIndex}
          params={[...paramBundles.depth, Z_DEPTH_CENTER_PARAM]}
        />
      </ParamToolbar>
      <ParamBodyRow>
        <PadColumn>
          <PadRoot ref={dragContainer} onMouseDown={onMouseDown}>
            <ZWindow z={outputZ} depth={outputDepth} centerMode={centerMode} />
            <Cursor x={outputZ} y={0.5} color="#f2c66daa" withVertical />
            <Cursor x={baseZ} y={0.5} color="#fff" withVertical />
            <CenterButton
              type="button"
              title="Show Z center presets"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setCenterMenuOpen((open) => !open)
              }}
            >
              Center: {centerMode === 'stage' ? 'Stage' : 'Dance'}
            </CenterButton>
            {centerMenuOpen && (
              <CenterPopup
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                <CenterOption
                  type="button"
                  $active={centerMode === 'stage'}
                  onClick={() => applyCenterMode('stage')}
                >
                  Stage Center
                </CenterOption>
                <CenterOption
                  type="button"
                  $active={centerMode === 'dance'}
                  onClick={() => applyCenterMode('dance')}
                >
                  Dance Floor Center
                </CenterOption>
              </CenterPopup>
            )}
            <PadCaption>Z Depth Axis</PadCaption>
          </PadRoot>
        </PadColumn>

        <DepthControls
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <DepthRack>
            <SplitDimensionSlider
              param="depth"
              splitIndex={splitIndex}
              label="Depth"
              title="Depth of the Z movement window"
            />
          </DepthRack>
        </DepthControls>
      </ParamBodyRow>
    </Root>
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

const PadRoot = styled.div`
  position: relative;
  width: 200px;
  min-width: 200px;
  height: 100%;
  min-height: 0;
  background: #000;
  border: 1px solid ${(props) => props.theme.colors.divider};
  overflow: hidden;
`

const WindowRoot = styled.div`
  position: absolute;
  top: 0;
  height: 100%;
  background: #ffd9662f;
  border: 1px solid #ffd96688;
  border-radius: 0.2rem;
`

const PadCaption = styled.div`
  position: absolute;
  left: 0.3rem;
  bottom: 0.2rem;
  font-size: 0.62rem;
  color: #ffe7a9;
  background: #0009;
  border-radius: 0.2rem;
  padding: 0.06rem 0.28rem;
`

const CenterButton = styled.button`
  position: absolute;
  left: 0.3rem;
  top: 0.3rem;
  font-size: 0.6rem;
  color: #ffe9ba;
  background: #0008;
  border: 1px solid #ffffff3d;
  border-radius: 0.2rem;
  padding: 0.08rem 0.3rem;
  cursor: pointer;
`

const CenterPopup = styled.div`
  position: absolute;
  left: 0.3rem;
  top: 2rem;
  min-width: 8.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.22rem;
  background: #05070ecc;
  border: 1px solid #ffffff33;
  border-radius: 0.24rem;
  z-index: 3;
`

const CenterOption = styled.button<{ $active: boolean }>`
  background: ${(props) => (props.$active ? '#7fa8ff35' : '#0008')};
  color: ${(props) => (props.$active ? '#f3f7ff' : '#d0d8e9')};
  border: 1px solid ${(props) => (props.$active ? '#8fb1ff88' : '#ffffff22')};
  border-radius: 0.24rem;
  font-size: 0.62rem;
  padding: 0.14rem 0.24rem;
  text-align: left;
  cursor: pointer;
`

const DepthControls = styled.div`
  position: relative;
  width: 2.05rem;
  min-width: 2.05rem;
  height: 100%;
  min-height: 0;
  padding: 0.1rem 0.16rem;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 0.3rem;
  background: rgba(0, 0, 0, 0.62);
  display: flex;
  align-items: stretch;
  justify-content: center;
  z-index: 1;
`

const DepthRack = styled.div`
  display: flex;
  align-items: stretch;
  justify-content: center;
  width: 100%;
  height: 100%;
`
