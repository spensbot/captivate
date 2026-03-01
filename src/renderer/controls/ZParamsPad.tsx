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

interface Props {
  splitIndex: number
}

type ZCenterMode = 'stage' | 'dance'

const Z_DEPTH_CENTER_PARAM = 'zCenterReference'

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function axisPosZ(value: number | undefined): number {
  if (value !== undefined) return value
  return 1
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
  return mode === 'dance' ? 0.5 : 1
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
    centerMode === 'dance'
      ? (safeZ - safeDepth / 2) * 100
      : (1 - safeDepth) * 100
  const width = safeDepth * 100

  return (
    <WindowRoot
      style={{
        left: `${left}%`,
        width: `${width}%`,
      }}
    />
  )
}

function Grid({ count = 12 }: { count?: number }) {
  const items = Array.from({ length: count + 1 }, (_, i) => i / count)
  return (
    <>
      {items.map((ratio) => (
        <GridLineV key={`v-${ratio}`} style={{ left: `${ratio * 100}%` }} />
      ))}
      {items.map((ratio) => (
        <GridLineH key={`h-${ratio}`} style={{ top: `${ratio * 100}%` }} />
      ))}
    </>
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
  const centerZ = zCenterPreset(centerMode)

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
      <PadRoot ref={dragContainer} onMouseDown={onMouseDown}>
        <Grid count={12} />
        <CenterLine style={{ left: `${centerZ * 100}%` }} />
        <ZWindow z={outputZ} depth={outputDepth} centerMode={centerMode} />
        <Cursor x={outputZ} y={0.5} color="#6f86beaa" withVertical />
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

      <ParamXButton
        splitIndex={splitIndex}
        params={[...paramBundles.depth, Z_DEPTH_CENTER_PARAM]}
      />
    </Root>
  )
}

const Root = styled.div`
  position: relative;
  width: 200px;
  height: 180px;
  border: 1px solid ${(props) => props.theme.colors.divider};
  background: #000;
  overflow: hidden;
  margin-right: 1rem;
`

const PadRoot = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
`

const GridLineV = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: #6f86be24;
  transform: translateX(-0.5px);
`

const GridLineH = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: #6f86be15;
  transform: translateY(-0.5px);
`

const WindowRoot = styled.div`
  position: absolute;
  top: 19%;
  height: 62%;
  background: #6f86be2a;
  border: 1px solid #6f86be66;
`

const CenterLine = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: #f7d5979a;
  transform: translateX(-0.5px);
`

const PadCaption = styled.div`
  position: absolute;
  left: 0.3rem;
  bottom: 0.2rem;
  font-size: 0.62rem;
  color: #d5def0;
  background: #0009;
  border-radius: 0.2rem;
  padding: 0.06rem 0.28rem;
`

const CenterButton = styled.button`
  position: absolute;
  left: 0.3rem;
  top: 0.3rem;
  font-size: 0.6rem;
  color: #dbe8ff;
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
