import { useMemo, useRef } from 'react'
import styled from 'styled-components'
import { useDmxSelector, useTypedSelector } from '../redux/store'
import FixtureCursor from './FixtureCursor'
import useDragMapped, { MappedPos } from '../hooks/useDragMapped'
import { useDispatch } from 'react-redux'
import {
  incrementFixtureWindow,
  setSelectedFixture,
  setFixtureRotation,
  setFixtureWindow,
  setFixtureWindowEnabled,
} from '../redux/dmxSlice'
import { setFxtrDepthOn } from '../redux/guiSlice'
import { secondaryEnabled } from 'renderer/base/keyUtil'
import {
  METERS_PER_FOOT,
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
import StageLengthField from '../base/StageLengthField'
import { Window2D_t } from '../../shared/window'
import { isMoverFixtureType } from '../../shared/dmxFixtures'

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

const FIXTURE_PICK_TOLERANCE = 0.04
const DRAG_MOVE_THRESHOLD = 0.001

/** Physical width / height of the pad so 1 normalized unit matches the same stage footage on both axes. */
function padPhysicalAspectRatio(
  stage: StageDimensions,
  horizontalAxis: Axis,
  verticalAxis: Axis
): number {
  const w = Math.max(0.01, stageAxisLengthFt(stage, horizontalAxis))
  const h = Math.max(0.01, stageAxisLengthFt(stage, verticalAxis))
  return w / h
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
  const aspectRatio = padPhysicalAspectRatio(stage, horizontalAxis, verticalAxis)

  return (
    <PadCard>
      <PadTitle>{title}</PadTitle>
      <PadRoot
        ref={dragContainer}
        data-fixture-pad=""
        onMouseDown={onMouseDown}
        $aspectRatio={aspectRatio}
      >
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
  const fixtureWindowByIndex = useMemo(() => {
    const map = new Map<number, Window2D_t>()
    for (const row of fixtureRows) {
      map.set(row.index, row.fixture.window)
    }
    return map
  }, [fixtureRows])
  const activeFixture = useDmxSelector((state) => state.activeFixture)
  const selectedFixtureWindow = useDmxSelector((state) =>
    state.activeFixture === null ? undefined : state.universe[state.activeFixture]?.window
  )
  const selectedFixtureRotation = useDmxSelector((state) =>
    state.activeFixture === null
      ? undefined
      : state.universe[state.activeFixture]?.rotation
  )
  const selectedFixtureIsMover = useDmxSelector((state) => {
    if (state.activeFixture === null) {
      return false
    }

    const fixture = state.universe[state.activeFixture]
    if (fixture === undefined) {
      return false
    }

    const fixtureType = state.fixtureTypesByID[fixture.type]
    if (fixtureType === undefined) {
      return false
    }

    return isMoverFixtureType(fixtureType)
  })
  const stage = useDmxSelector((state) => state.stage)
  const dispatch = useDispatch()
  const zDepthEnabled = useTypedSelector(
    (state) => state.gui.fxtrDepthOn
  )
  const dragFixtureIndexRef = useRef<number | null>(null)
  const dragHasMovedRef = useRef(false)

  function ensureAxisEnabled(index: number, axis: Axis) {
    const fixtureWindow = fixtureWindowByIndex.get(index)
    if (fixtureWindow?.[axis] !== undefined) {
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

  function resolveFixtureAtPoint(
    horizontalAxis: Axis,
    verticalAxis: Axis,
    x: number,
    y: number
  ): number | null {
    const candidates = fixtureRows
      .filter(({ fixture }) => {
        const fixtureX = axisPos(fixture.window, horizontalAxis)
        const fixtureY = axisPos(fixture.window, verticalAxis)
        return Math.hypot(fixtureX - x, fixtureY - y) <= FIXTURE_PICK_TOLERANCE
      })
      .map((row) => ({
        index: row.index,
        distance: Math.hypot(
          axisPos(row.fixture.window, horizontalAxis) - x,
          axisPos(row.fixture.window, verticalAxis) - y
        ),
      }))
      .sort((left, right) => left.distance - right.distance)

    if (candidates.length === 0) {
      return null
    }

    if (candidates.length === 1) {
      return candidates[0].index
    }

    if (
      activeFixture !== null &&
      candidates.some((candidate) => candidate.index === activeFixture)
    ) {
      return activeFixture
    }

    return activeFixture ?? candidates[0].index
  }

  function onPadDrag(
    horizontalAxis: Axis,
    verticalAxis: Axis,
    mapped: MappedPos,
    e: MouseEvent,
    status: DragStatus
  ) {
    if (status === 'Start') {
      const clickedFixture = resolveFixtureAtPoint(
        horizontalAxis,
        verticalAxis,
        mapped.x,
        mapped.y
      )
      if (clickedFixture !== null && clickedFixture !== activeFixture) {
        dispatch(setSelectedFixture(clickedFixture))
      }
      dragFixtureIndexRef.current = clickedFixture ?? activeFixture ?? null
      dragHasMovedRef.current = false
      return
    }

    if (status === 'End') {
      dragFixtureIndexRef.current = null
      dragHasMovedRef.current = false
      return
    }

    const dragFixtureIndex =
      dragFixtureIndexRef.current ?? activeFixture ?? undefined
    if (dragFixtureIndex === undefined) return

    if (status !== 'Moved') {
      return
    }

    const movementMagnitude = Math.hypot(mapped.dx, mapped.dy)
    if (!dragHasMovedRef.current) {
      if (movementMagnitude < DRAG_MOVE_THRESHOLD) {
        return
      }
      dragHasMovedRef.current = true
      ensureAxisEnabled(dragFixtureIndex, horizontalAxis)
      ensureAxisEnabled(dragFixtureIndex, verticalAxis)
    }

    if (secondaryEnabled(e)) {
      const incrementPayload: {
        index: number
        dWidth?: number
        dHeight?: number
        dDepth?: number
      } = {
        index: dragFixtureIndex,
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
      index: dragFixtureIndex,
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
                dispatch(setFxtrDepthOn(event.target.checked))
              }}
            />
            <span>Enable Z Depth</span>
          </DepthToggle>
          <StageScaleControls compact />
        </TopControls>
      </TopRow>
      <BodyScroller>
        <GridViewsScroller>
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
        </GridViewsScroller>
        {activeFixture !== null && (
          <Inspector>
            <InspectorTitle>Selected Fixture Position</InspectorTitle>
            <InspectorRow>
              {positionAxes.map((axis) => {
                const displayVal = stageAxisToDisplayValue(
                  stage,
                  axis,
                  axisPos(selectedFixtureWindow, axis)
                )

                const axisMaxDisplay = Number(
                  (
                    stageAxisLengthFt(stage, axis) *
                    (stage.unit === 'm' ? METERS_PER_FOOT : 1)
                  ).toFixed(6)
                )
                return (
                  <StageLengthField
                    key={axis}
                    val={Number(displayVal.toFixed(3))}
                    label={`${AXIS_LABEL[axis]} (${stage.unit})`}
                    numberType="float"
                    step={0.01}
                    min={0}
                    max={axisMaxDisplay}
                    variant="outlined"
                    stageUnit={stage.unit}
                    onChange={(newVal) => setFixtureAxisFromInput(axis, newVal)}
                    title={`Precise ${AXIS_LABEL[axis]} position (${stage.unit}). Snap grid is ${STAGE_SNAP_GRID_FEET} ft.`}
                  />
                )
              })}
            </InspectorRow>
            <InspectorHint>
              Mouse drag uses snap increments of {STAGE_SNAP_GRID_FEET} ft. Drag the
              white edge handles on the selected fixture to resize its motion window on
              each visible axis; right-click/secondary drag also adjusts size.
            </InspectorHint>
            {!zDepthEnabled && (
              <InspectorHint>
                Lighting scenes and LED color windows use the X/Y plane only (no Z
                windowing). Movers keep their own pan/tilt space; Enable Z Depth for fixture
                depth editing, Z windowing, and depth in the 3D preview.
              </InspectorHint>
            )}
            {!selectedFixtureIsMover && (
              <>
                <InspectorTitle style={{ marginTop: '0.45rem' }}>
                  Fixture Rotation
                </InspectorTitle>
                <InspectorRow>
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
              </>
            )}
          </Inspector>
        )}
      </BodyScroller>
    </Root>
  )
}

const Root = styled.div`
  background-color: #0008;
  overflow: hidden;
  padding: 0.5rem;
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const TopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
`

const BodyScroller = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.15rem;
  scrollbar-width: thin;
  scrollbar-color: #7a7a7a99 #0000;

  &::-webkit-scrollbar {
    display: block !important;
    width: 10px;
  }

  &::-webkit-scrollbar-track {
    background: #0000;
  }

  &::-webkit-scrollbar-thumb {
    background: #7a7a7a99;
    border-radius: 999px;
  }
`

const SectionTitle = styled.div`
  font-size: 0.95rem;
  color: ${(props) => props.theme.colors.text.primary};
`

const TopControls = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
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

const GridViewsScroller = styled.div`
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 0.15rem;
  scrollbar-width: thin;
  scrollbar-color: #7a7a7a99 #0000;

  &::-webkit-scrollbar {
    display: block !important;
    height: 10px;
  }

  &::-webkit-scrollbar-track {
    background: #0000;
  }

  &::-webkit-scrollbar-thumb {
    background: #7a7a7a99;
    border-radius: 999px;
  }
`

const GridViews = styled.div<{ $withDepth: boolean }>`
  display: grid;
  grid-template-columns: ${(props) => (props.$withDepth ? '1fr 1fr' : '1fr')};
  gap: 0.7rem;
  width: 100%;
  align-items: start;
`

const PadCard = styled.div`
  width: 100%;
  border: 1px solid #ffffff22;
  border-radius: 0.35rem;
  background: #070a1299;
  padding: 0.35rem;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
`

const PadTitle = styled.div`
  font-size: 0.74rem;
  color: ${(props) => props.theme.colors.text.secondary};
  margin-bottom: 0.25rem;
`

const PadRoot = styled.div<{ $aspectRatio: number }>`
  position: relative;
  width: 100%;
  max-width: 100%;
  aspect-ratio: ${(props) => props.$aspectRatio} / 1;
  flex: 0 0 auto;
  min-height: 12rem;
  max-height: min(52vh, 28rem);
  margin-inline: auto;
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
  margin-top: 0.45rem;
`

const InspectorTitle = styled.div`
  font-size: 0.74rem;
  color: ${(props) => props.theme.colors.text.secondary};
  margin-bottom: 0.35rem;
`

const InspectorRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8.75rem, 1fr));
  gap: 0.4rem;
`

const InspectorHint = styled.div`
  margin-top: 0.35rem;
  font-size: 0.66rem;
  color: ${(props) => props.theme.colors.text.secondary};
`
