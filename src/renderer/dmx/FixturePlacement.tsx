import { useState } from 'react'
import styled from 'styled-components'
import { useDmxSelector } from '../redux/store'
import FixtureCursor from './FixtureCursor'
import useDragMapped, { MappedPos } from '../hooks/useDragMapped'
import { useDispatch } from 'react-redux'
import {
  incrementFixtureWindow,
  setFixtureRotation,
  setFixtureWindow,
  setFixtureWindowEnabled,
} from '../redux/dmxSlice'
import { secondaryEnabled } from 'renderer/base/keyUtil'
import {
  StageAxis,
  StageDimensions,
  STAGE_SNAP_GRID_FEET,
  snapStageAxisNormalized,
  stageAxisFromDisplayValue,
  stageAxisLengthFt,
  stageAxisToDisplayValue,
} from '../../shared/stage'
import StageScaleControls from './StageScaleControls'
import NumberField from '../base/NumberField'
import { Window2D_t } from '../../shared/window'

type DragStatus = 'Start' | 'Moved' | 'End'
type Axis = StageAxis

const AXIS_LABEL: { [key in Axis]: string } = {
  x: 'X',
  y: 'Y',
  z: 'Z',
}

function defaultAxisPos(axis: Axis): number {
  return axis === 'z' ? 1 : 0.5
}

function axisPos(window: Window2D_t | undefined, axis: Axis): number {
  return window?.[axis]?.pos ?? defaultAxisPos(axis)
}

function getGridStops(stage: StageDimensions, axis: Axis): number[] {
  const axisLengthFt = Math.max(0.01, stageAxisLengthFt(stage, axis))
  const rawCount = Math.max(1, Math.floor(axisLengthFt / STAGE_SNAP_GRID_FEET))
  const stride = Math.max(1, Math.ceil(rawCount / 120))
  const stops: number[] = []

  for (let step = 0; step <= rawCount; step += stride) {
    const feet = step * STAGE_SNAP_GRID_FEET
    stops.push(
      stageAxisFromDisplayValue(
        {
          ...stage,
          unit: 'ft',
        },
        axis,
        feet
      )
    )
  }

  if (!stops.includes(0)) stops.push(0)
  if (!stops.includes(1)) stops.push(1)
  return Array.from(new Set(stops)).sort((a, b) => a - b)
}

function Pad({
  title,
  horizontalAxis,
  verticalAxis,
  stage,
  fixtureIndexes,
  onDrag,
}: {
  title: string
  horizontalAxis: Axis
  verticalAxis: Axis
  stage: StageDimensions
  fixtureIndexes: number[]
  onDrag: (
    horizontalAxis: Axis,
    verticalAxis: Axis,
    mapped: MappedPos,
    e: MouseEvent,
    status: DragStatus
  ) => void
}) {
  const [dragContainer, onMouseDown] = useDragMapped((mapped, e, status) =>
    onDrag(horizontalAxis, verticalAxis, mapped, e, status)
  )
  const horizontalStops = getGridStops(stage, horizontalAxis)
  const verticalStops = getGridStops(stage, verticalAxis)

  return (
    <PadCard>
      <PadTitle>{title}</PadTitle>
      <PadRoot ref={dragContainer} onMouseDown={onMouseDown}>
        {horizontalStops.map((stop) => (
          <GridLineV key={`v-${horizontalAxis}-${stop}`} style={{ left: `${stop * 100}%` }} />
        ))}
        {verticalStops.map((stop) => (
          <GridLineH
            key={`h-${verticalAxis}-${stop}`}
            style={{ top: `${(1 - stop) * 100}%` }}
          />
        ))}
        <CrossV />
        <CrossH />
        {fixtureIndexes.map((index) => (
          <FixtureCursor
            key={`${horizontalAxis}-${verticalAxis}-${index}`}
            index={index}
            horizontalAxis={horizontalAxis}
            verticalAxis={verticalAxis}
            showSubFixtures={false}
          />
        ))}
      </PadRoot>
      <AxisLabelRow>
        <span>{AXIS_LABEL[horizontalAxis]} axis</span>
        <span>{AXIS_LABEL[verticalAxis]} axis</span>
      </AxisLabelRow>
    </PadCard>
  )
}

export default function FixturePlacement() {
  const fixtureRows = useDmxSelector((state) =>
    state.universe
      .map((fixture, index) => ({ fixture, index }))
      .filter(({ fixture }) => (fixture.universe ?? 1) === state.activeUniverse)
  )
  const fixtureIndexes = fixtureRows.map(({ index }) => index)
  const activeFixture = useDmxSelector((state) => state.activeFixture)
  const selectedFixtureWindow = useDmxSelector((state) =>
    state.activeFixture === null ? undefined : state.universe[state.activeFixture]?.window
  )
  const selectedFixtureRotation = useDmxSelector((state) =>
    state.activeFixture === null
      ? undefined
      : state.universe[state.activeFixture]?.rotation
  )
  const stage = useDmxSelector((state) => state.stage)
  const dispatch = useDispatch()
  const [zDepthEnabled, setZDepthEnabled] = useState(false)

  function ensureAxisEnabled(index: number, axis: Axis) {
    if (selectedFixtureWindow?.[axis] !== undefined) {
      return
    }
    dispatch(
      setFixtureWindowEnabled({
        index,
        dimension: axis,
        isEnabled: true,
      })
    )
  }

  function onPadDrag(
    horizontalAxis: Axis,
    verticalAxis: Axis,
    mapped: MappedPos,
    e: MouseEvent,
    status: DragStatus
  ) {
    if (activeFixture === null) return

    if (status === 'Start') {
      ensureAxisEnabled(activeFixture, horizontalAxis)
      ensureAxisEnabled(activeFixture, verticalAxis)
    }

    if (secondaryEnabled(e)) {
      const incrementPayload: {
        index: number
        dWidth?: number
        dHeight?: number
        dDepth?: number
      } = {
        index: activeFixture,
      }
      if (horizontalAxis === 'x') incrementPayload.dWidth = mapped.dx
      if (horizontalAxis === 'y') incrementPayload.dHeight = mapped.dx
      if (horizontalAxis === 'z') incrementPayload.dDepth = mapped.dx

      if (verticalAxis === 'x') incrementPayload.dWidth = mapped.dy
      if (verticalAxis === 'y') incrementPayload.dHeight = mapped.dy
      if (verticalAxis === 'z') incrementPayload.dDepth = mapped.dy

      dispatch(incrementFixtureWindow(incrementPayload))
      return
    }

    const nextHorizontal = snapStageAxisNormalized(
      stage,
      horizontalAxis,
      mapped.x,
      STAGE_SNAP_GRID_FEET
    )
    const nextVertical = snapStageAxisNormalized(
      stage,
      verticalAxis,
      mapped.y,
      STAGE_SNAP_GRID_FEET
    )

    const payload: {
      index: number
      x?: number
      y?: number
      z?: number
    } = {
      index: activeFixture,
    }
    payload[horizontalAxis] = nextHorizontal
    payload[verticalAxis] = nextVertical

    dispatch(setFixtureWindow(payload))
  }

  function setFixtureAxisFromInput(axis: Axis, displayValue: number) {
    if (activeFixture === null) return

    ensureAxisEnabled(activeFixture, axis)
    dispatch(
      setFixtureWindow({
        index: activeFixture,
        [axis]: stageAxisFromDisplayValue(stage, axis, displayValue),
      })
    )
  }

  function rotationAngle(axis: Axis): number {
    const value = selectedFixtureRotation?.[axis]
    return Number.isFinite(value) ? Number(value) : 0
  }

  function setFixtureRotationAxis(axis: Axis, angleDeg: number) {
    if (activeFixture === null) return
    dispatch(
      setFixtureRotation({
        index: activeFixture,
        [axis]: angleDeg,
      })
    )
  }

  const positionAxes: Axis[] = zDepthEnabled ? ['x', 'y', 'z'] : ['x', 'y']

  return (
    <Root>
      <TopRow>
        <SectionTitle>Fixture Mapping</SectionTitle>
        <TopControls>
          <DepthToggle>
            <input
              type="checkbox"
              checked={zDepthEnabled}
              onChange={(event) => {
                setZDepthEnabled(event.target.checked)
              }}
            />
            <span>Enable Z Depth</span>
          </DepthToggle>
          <StageScaleControls compact />
        </TopControls>
      </TopRow>
      <GridViews $withDepth={zDepthEnabled}>
        <Pad
          title="XY View (Front of House)"
          horizontalAxis="x"
          verticalAxis="y"
          stage={stage}
          fixtureIndexes={fixtureIndexes}
          onDrag={onPadDrag}
        />
        {zDepthEnabled && (
          <Pad
            title="Top Down View (Stage At Top)"
            horizontalAxis="x"
            verticalAxis="z"
            stage={stage}
            fixtureIndexes={fixtureIndexes}
            onDrag={onPadDrag}
          />
        )}
      </GridViews>
      {activeFixture !== null && (
        <Inspector>
          <InspectorTitle>Selected Fixture Position</InspectorTitle>
          <InspectorRow $columns={positionAxes.length}>
            {positionAxes.map((axis) => {
              const displayVal = stageAxisToDisplayValue(
                stage,
                axis,
                axisPos(selectedFixtureWindow, axis)
              )

              return (
                <NumberField
                  key={axis}
                  val={Number(displayVal.toFixed(3))}
                  label={`${AXIS_LABEL[axis]} (${stage.unit})`}
                  numberType="float"
                  step={0.01}
                  min={0}
                  max={Number(
                    (stageAxisLengthFt(stage, axis) * (stage.unit === 'm' ? 0.3048 : 1)).toFixed(6)
                  )}
                  variant="outlined"
                  onChange={(newVal) => setFixtureAxisFromInput(axis, newVal)}
                  title={`Precise ${AXIS_LABEL[axis]} position (${stage.unit}). Snap grid is ${STAGE_SNAP_GRID_FEET} ft.`}
                />
              )
            })}
          </InspectorRow>
          <InspectorHint>
            Mouse drag uses snap increments of {STAGE_SNAP_GRID_FEET} ft.
            Right-click/secondary drag adjusts window size per axis.
          </InspectorHint>
          {!zDepthEnabled && (
            <InspectorHint>
              Turn on `Enable Z Depth` above to edit depth with a top-down stage view.
            </InspectorHint>
          )}
          <InspectorTitle style={{ marginTop: '0.45rem' }}>
            Fixture Rotation
          </InspectorTitle>
          <InspectorRow $columns={3}>
            {(['x', 'y', 'z'] as Axis[]).map((axis) => (
              <NumberField
                key={`rotation-${axis}`}
                val={Number(rotationAngle(axis).toFixed(3))}
                label={`Rot ${AXIS_LABEL[axis]} (deg)`}
                numberType="float"
                step={0.1}
                min={-360}
                max={360}
                variant="outlined"
                onChange={(newVal) => setFixtureRotationAxis(axis, newVal)}
              />
            ))}
          </InspectorRow>
        </Inspector>
      )}
    </Root>
  )
}

const Root = styled.div`
  background-color: #0008;
  overflow: auto;
  padding: 0.5rem;
  flex: 1 0 50%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const TopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
`

const SectionTitle = styled.div`
  font-size: 0.95rem;
  color: ${(props) => props.theme.colors.text.primary};
`

const TopControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`

const DepthToggle = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.74rem;
  color: ${(props) => props.theme.colors.text.secondary};
  user-select: none;
`

const GridViews = styled.div<{ $withDepth: boolean }>`
  --pad-size: ${(props) =>
    props.$withDepth ? 'clamp(18rem, 38vw, 30rem)' : 'clamp(18rem, 56vw, 34rem)'};
  display: grid;
  grid-template-columns: repeat(${(props) => (props.$withDepth ? 2 : 1)}, var(--pad-size));
  gap: 0.5rem;
  width: max-content;
  min-width: 100%;
  align-items: start;
`

const PadCard = styled.div`
  width: var(--pad-size);
  border: 1px solid #ffffff22;
  border-radius: 0.35rem;
  background: #070a1299;
  padding: 0.35rem;
  display: flex;
  flex-direction: column;
`

const PadTitle = styled.div`
  font-size: 0.74rem;
  color: ${(props) => props.theme.colors.text.secondary};
  margin-bottom: 0.25rem;
`

const PadRoot = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  flex: 0 0 auto;
  background: #000a;
  border: 1px solid #ffffff22;
  border-radius: 0.2rem;
  overflow: hidden;
`

const GridLineV = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: #6f86be26;
  transform: translateX(-0.5px);
`

const GridLineH = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: #6f86be26;
  transform: translateY(-0.5px);
`

const CrossV = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background: #ffffff33;
`

const CrossH = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: #ffffff33;
`

const AxisLabelRow = styled.div`
  margin-top: 0.25rem;
  display: flex;
  justify-content: space-between;
  font-size: 0.66rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const Inspector = styled.div`
  border: 1px solid #ffffff22;
  border-radius: 0.35rem;
  background: #070a1299;
  padding: 0.45rem;
`

const InspectorTitle = styled.div`
  font-size: 0.74rem;
  color: ${(props) => props.theme.colors.text.secondary};
  margin-bottom: 0.35rem;
`

const InspectorRow = styled.div<{ $columns: number }>`
  display: grid;
  grid-template-columns: repeat(${(props) => props.$columns}, minmax(8rem, 1fr));
  gap: 0.4rem;
`

const InspectorHint = styled.div`
  margin-top: 0.35rem;
  font-size: 0.66rem;
  color: ${(props) => props.theme.colors.text.secondary};
`
