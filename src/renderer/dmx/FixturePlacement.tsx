import { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import ChevronLeft from '@mui/icons-material/ChevronLeft'
import ChevronRight from '@mui/icons-material/ChevronRight'
import Button from '@mui/material/Button'
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
  setFixtureGroups,
} from '../redux/dmxSlice'
import { getFixtureGroupPickerOptions } from '../../shared/fixtureGroups'
import FixtureGroupsModal from './FixtureGroupsModal'
import { setFxtrDepthOn } from '../redux/guiSlice'
import { secondaryEnabled } from 'renderer/base/keyUtil'
import {
  METERS_PER_FOOT,
  StageAxis,
  StageDimensions,
  STAGE_SNAP_GRID_FEET,
  snapStageAxisNormalized,
  stageAxisFromDisplayValue,
  stageAxisFromFeet,
  stageAxisLengthFt,
  stageAxisToDisplayValue,
  stageAxisToFeet,
} from '../../shared/stage'
import StageScaleControls from './StageScaleControls'
import ToggleSwitch from '../base/ToggleSwitch'
import NumberField from '../base/NumberField'
import StageLengthField from '../base/StageLengthField'
import { Window2D_t } from '../../shared/window'
import { isMoverFixtureType } from '../../shared/dmxFixtures'
import { canvasLayerZIndex } from '../zIndexes'
import SectionHelpButton, {
  HelpIntro,
  HelpList,
  HelpTitle,
} from './SectionHelpPopover'

type DragStatus = 'Start' | 'Moved' | 'End'
type Axis = StageAxis
type PadAxis = 'horizontal' | 'vertical'

function padAxisLockFromDragDelta(dx: number, dy: number): PadAxis {
  return Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical'
}

function isKeyboardNudgeTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true
  }
  return target.isContentEditable
}

function nudgeStageAxisNormalized(
  stage: StageDimensions,
  axis: StageAxis,
  currentNormalized: number,
  deltaFeet: number,
  snapFeet: number
): number {
  const axisLengthFt = Math.max(0.00001, stageAxisLengthFt(stage, axis))
  const currentFeet = stageAxisToFeet(stage, axis, currentNormalized)
  const nextFeet = Math.min(axisLengthFt, Math.max(0, currentFeet + deltaFeet))
  return snapStageAxisNormalized(
    stage,
    axis,
    stageAxisFromFeet(stage, axis, nextFeet),
    snapFeet
  )
}

const AXIS_LABEL: { [key in Axis]: string } = {
  x: 'X',
  y: 'Y',
  z: 'Z',
}

/** Stage dimension name for each world axis (matches `StageDimensions` *Ft fields). */
const AXIS_STAGE_DIM: { [key in Axis]: string } = {
  x: 'Width',
  y: 'Height',
  z: 'Depth',
}

/** Minimum width of the mapping plot strip before horizontal scroll appears. */
const MAPPING_CONTENT_MIN_WIDTH = '20rem'

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

const FIXTURE_SNAP_GRID_OPTIONS_FT = [0.25, 0.5, 1, 2, 4] as const

function snapSpacingDisplayLabel(stage: StageDimensions, feet: number): string {
  const displayLen = feet * (stage.unit === 'm' ? METERS_PER_FOOT : 1)
  const decimals = displayLen < 1 ? 2 : 2
  return `${Number(displayLen.toFixed(decimals))} ${stage.unit}`
}

function snapGridDisplayStep(stage: StageDimensions, snapGridFeet: number): number {
  const displayLen = snapGridFeet * (stage.unit === 'm' ? METERS_PER_FOOT : 1)
  return Number(displayLen.toFixed(3))
}

function MappingHelpButton({
  stage,
  snapGridFeet,
  zDepthEnabled,
}: {
  stage: StageDimensions
  snapGridFeet: number
  zDepthEnabled: boolean
}) {
  const snapLabel = snapSpacingDisplayLabel(stage, snapGridFeet)

  return (
    <SectionHelpButton ariaLabel="How to place fixtures on the map">
      <HelpTitle>How to place fixtures</HelpTitle>
      <HelpIntro>
        Pick a fixture from the patch list above, or click it on the map. Then
        use the map and fields below to set where it sits on stage.
      </HelpIntro>
      <HelpList>
        <li>
          To move a fixture, drag it on the map. It snaps to{' '}
          <strong>{snapLabel}</strong> steps — the same spacing as the grid
          lines and the Snap grid control.
        </li>
        <li>
          To slide in a straight line, hold <strong>Shift</strong> while
          dragging. Movement locks to horizontal or vertical depending on the
          direction you were already moving when you pressed Shift.
        </li>
        <li>
          To nudge a selected fixture, use the <strong>arrow keys</strong>.
          Each press moves one snap step; hold <strong>Shift</strong> for a
          larger jump.
        </li>
        <li>
          To type an exact position, enter values in the fields below the map.
          Typed values are not snapped to the grid.
        </li>
        <li>
          To change how much room a fixture has to move, resize its outline
          with <strong>Ctrl+drag</strong> (<strong>Cmd+drag</strong> on Mac)
          or by pulling the white handles when it is selected.
        </li>
        {zDepthEnabled ? (
          <li>
            You have depth placement turned on. Switch pages at the bottom to
            place fixtures on the front view (XY) or the top-down view (XZ).
            Height also appears in the 3D preview.
          </li>
        ) : (
          <li>
            Most lighting looks only need left/right and up/down (X and Y) for
            now. Turn on <strong>Enable Z Depth</strong> when you need height
            on the map; movers can still be aimed with pan and tilt.
          </li>
        )}
      </HelpList>
    </SectionHelpButton>
  )
}

function getGridStops(
  stage: StageDimensions,
  axis: Axis,
  gridSpacingFeet: number
): number[] {
  const spacing = Math.max(0.01, gridSpacingFeet)
  const axisLengthFt = Math.max(0.01, stageAxisLengthFt(stage, axis))
  const rawCount = Math.max(1, Math.floor(axisLengthFt / spacing))
  const stride = Math.max(1, Math.ceil(rawCount / 120))
  const stops: number[] = []

  for (let step = 0; step <= rawCount; step += stride) {
    const feet = step * spacing
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
  snapGridFeet,
  fixtureIndexes,
  onDrag,
}: {
  title: string
  horizontalAxis: Axis
  verticalAxis: Axis
  stage: StageDimensions
  snapGridFeet: number
  fixtureIndexes: number[]
  onDrag: (
    horizontalAxis: Axis,
    verticalAxis: Axis,
    mapped: MappedPos,
    e: MouseEvent,
    status: DragStatus
  ) => void
}) {
  const [dragContainer, onPointerDown] = useDragMapped((mapped, e, status) =>
    onDrag(horizontalAxis, verticalAxis, mapped, e, status)
  )
  const horizontalStops = getGridStops(stage, horizontalAxis, snapGridFeet)
  const verticalStops = getGridStops(stage, verticalAxis, snapGridFeet)
  const aspectRatio = padPhysicalAspectRatio(stage, horizontalAxis, verticalAxis)
  const bottomLabel = `${AXIS_LABEL[horizontalAxis]} · ${AXIS_STAGE_DIM[horizontalAxis]}`
  const leftLabel = `${AXIS_LABEL[verticalAxis]} · ${AXIS_STAGE_DIM[verticalAxis]}`

  return (
    <PadCard>
      <PadTitle>{title}</PadTitle>
      <PadBodyRow>
        <LeftAxisLabel aria-hidden>
          <LeftAxisLabelText>{leftLabel}</LeftAxisLabelText>
        </LeftAxisLabel>
        <PadPlotColumn>
          <PadRoot
            ref={dragContainer}
            data-fixture-pad=""
            onPointerDown={onPointerDown}
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
                showSubFixtures={true}
              />
            ))}
          </PadRoot>
          <BottomAxisLabel>{bottomLabel}</BottomAxisLabel>
        </PadPlotColumn>
      </PadBodyRow>
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
  const dragStartMappedRef = useRef<{ x: number; y: number } | null>(null)
  const dragPadAxisLockRef = useRef<PadAxis | null>(null)
  const dragShiftDownRef = useRef(false)
  const dragLockAnchorRef = useRef<{
    horizontal: number
    vertical: number
  } | null>(null)
  const [snapGridFeet, setSnapGridFeet] = useState(STAGE_SNAP_GRID_FEET)
  const [fixtureGroupsModalOpen, setFixtureGroupsModalOpen] = useState(false)
  const groupsModalFixture = useDmxSelector((state) => {
    if (state.activeFixture === null) {
      return null
    }
    const fixture = state.universe[state.activeFixture]
    if (fixture === undefined) {
      return null
    }
    const fixtureType = state.fixtureTypesByID[fixture.type]
    const displayName =
      typeof fixture.name === 'string' && fixture.name.trim().length > 0
        ? fixture.name.trim()
        : (fixtureType?.name ?? 'Fixture')
    return {
      index: state.activeFixture,
      label: displayName,
      groups: fixture.groups,
    }
  })
  const availableFixtureGroups = useDmxSelector((state) =>
    getFixtureGroupPickerOptions(state.universe, state.fixtureTypesByID)
  )

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
      dragStartMappedRef.current = null
      dragPadAxisLockRef.current = null
      dragShiftDownRef.current = false
      dragLockAnchorRef.current = null
      return
    }

    if (status === 'End') {
      dragFixtureIndexRef.current = null
      dragHasMovedRef.current = false
      dragStartMappedRef.current = null
      dragPadAxisLockRef.current = null
      dragShiftDownRef.current = false
      dragLockAnchorRef.current = null
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
      dragStartMappedRef.current = { x: mapped.x, y: mapped.y }
      ensureAxisEnabled(dragFixtureIndex, horizontalAxis)
      ensureAxisEnabled(dragFixtureIndex, verticalAxis)
    }

    const fixtureWindow = fixtureWindowByIndex.get(dragFixtureIndex)
    if (e.shiftKey) {
      if (
        !dragShiftDownRef.current &&
        dragStartMappedRef.current !== null &&
        fixtureWindow !== undefined
      ) {
        const dx = mapped.x - dragStartMappedRef.current.x
        const dy = mapped.y - dragStartMappedRef.current.y
        dragPadAxisLockRef.current = padAxisLockFromDragDelta(dx, dy)
        dragLockAnchorRef.current = {
          horizontal: axisPos(fixtureWindow, horizontalAxis),
          vertical: axisPos(fixtureWindow, verticalAxis),
        }
      }
      dragShiftDownRef.current = true
    } else {
      dragShiftDownRef.current = false
      dragPadAxisLockRef.current = null
      dragLockAnchorRef.current = null
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

    let nextHorizontal = snapStageAxisNormalized(
      stage,
      horizontalAxis,
      mapped.x,
      snapGridFeet
    )
    let nextVertical = snapStageAxisNormalized(
      stage,
      verticalAxis,
      mapped.y,
      snapGridFeet
    )

    const padAxisLock = dragPadAxisLockRef.current
    const lockAnchor = dragLockAnchorRef.current
    if (padAxisLock === 'horizontal' && lockAnchor !== null) {
      nextVertical = lockAnchor.vertical
    } else if (padAxisLock === 'vertical' && lockAnchor !== null) {
      nextHorizontal = lockAnchor.horizontal
    }

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
  const rotationAxes: Axis[] = zDepthEnabled ? ['x', 'y', 'z'] : ['x', 'y']
  const [mappingPage, setMappingPage] = useState(0)

  useEffect(() => {
    if (!zDepthEnabled) {
      setMappingPage(0)
    }
  }, [zDepthEnabled])

  useEffect(() => {
    if (activeFixture === null) {
      return
    }

    const horizontalAxis: Axis = 'x'
    const verticalAxis: Axis =
      zDepthEnabled && mappingPage === 1 ? 'z' : 'y'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isKeyboardNudgeTarget(event.target)) {
        return
      }

      const stepFeet = event.shiftKey ? snapGridFeet * 4 : snapGridFeet
      let deltaHorizontalFeet = 0
      let deltaVerticalFeet = 0

      if (event.key === 'ArrowLeft') {
        deltaHorizontalFeet = -stepFeet
      } else if (event.key === 'ArrowRight') {
        deltaHorizontalFeet = stepFeet
      } else if (event.key === 'ArrowUp') {
        deltaVerticalFeet = stepFeet
      } else if (event.key === 'ArrowDown') {
        deltaVerticalFeet = -stepFeet
      } else {
        return
      }

      event.preventDefault()

      const fixtureWindow = fixtureWindowByIndex.get(activeFixture)
      if (fixtureWindow === undefined) {
        return
      }

      if (deltaHorizontalFeet !== 0) {
        ensureAxisEnabled(activeFixture, horizontalAxis)
      }
      if (deltaVerticalFeet !== 0) {
        ensureAxisEnabled(activeFixture, verticalAxis)
      }

      const payload: {
        index: number
        x?: number
        y?: number
        z?: number
      } = {
        index: activeFixture,
      }

      if (deltaHorizontalFeet !== 0) {
        payload[horizontalAxis] = nudgeStageAxisNormalized(
          stage,
          horizontalAxis,
          axisPos(fixtureWindow, horizontalAxis),
          deltaHorizontalFeet,
          snapGridFeet
        )
      }
      if (deltaVerticalFeet !== 0) {
        payload[verticalAxis] = nudgeStageAxisNormalized(
          stage,
          verticalAxis,
          axisPos(fixtureWindow, verticalAxis),
          deltaVerticalFeet,
          snapGridFeet
        )
      }

      dispatch(setFixtureWindow(payload))
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    activeFixture,
    dispatch,
    fixtureWindowByIndex,
    mappingPage,
    snapGridFeet,
    stage,
    zDepthEnabled,
  ])

  const mappingPageTitle =
    mappingPage === 0
      ? 'XY · Front of house'
      : 'XZ · Top down (stage toward top)'

  const snapStepDisplay = snapGridDisplayStep(stage, snapGridFeet)

  return (
    <Root>
      <TopRow>
        <TitleCluster>
          <SectionTitle>Fixture Mapping</SectionTitle>
          <MappingHelpButton
            stage={stage}
            snapGridFeet={snapGridFeet}
            zDepthEnabled={zDepthEnabled}
          />
        </TitleCluster>
        <TopControls>
          <DepthToggle>
            <DepthToggleLabel>Enable Z Depth</DepthToggleLabel>
            <ToggleSwitch
              checked={zDepthEnabled}
              onChange={(next) => dispatch(setFxtrDepthOn(next))}
              aria-label="Enable Z Depth"
            />
          </DepthToggle>
          <SnapGridControl>
            <SnapGridLabel htmlFor="fixture-snap-grid">Snap grid</SnapGridLabel>
            <SnapGridSelect
              id="fixture-snap-grid"
              value={snapGridFeet}
              onChange={(ev) => setSnapGridFeet(Number(ev.target.value))}
            >
              {FIXTURE_SNAP_GRID_OPTIONS_FT.map((ft) => (
                <option key={ft} value={ft}>
                  {snapSpacingDisplayLabel(stage, ft)}
                </option>
              ))}
            </SnapGridSelect>
          </SnapGridControl>
          <StageScaleControls compact showDepth={zDepthEnabled} />
        </TopControls>
      </TopRow>

      <MappingScrollRegion>
        <MappingWidthFloor>
          {!zDepthEnabled ? (
            <Pad
              title="XY · Front of house"
              horizontalAxis="x"
              verticalAxis="y"
              stage={stage}
              snapGridFeet={snapGridFeet}
              fixtureIndexes={fixtureIndexes}
              onDrag={onPadDrag}
            />
          ) : mappingPage === 0 ? (
            <Pad
              title={mappingPageTitle}
              horizontalAxis="x"
              verticalAxis="y"
              stage={stage}
              snapGridFeet={snapGridFeet}
              fixtureIndexes={fixtureIndexes}
              onDrag={onPadDrag}
            />
          ) : (
            <Pad
              title={mappingPageTitle}
              horizontalAxis="x"
              verticalAxis="z"
              stage={stage}
              snapGridFeet={snapGridFeet}
              fixtureIndexes={fixtureIndexes}
              onDrag={onPadDrag}
            />
          )}
          {zDepthEnabled ? (
            <PagerBar>
              <PagerArrow
                type="button"
                aria-label="Previous mapping page"
                title="XY map"
                disabled={mappingPage === 0}
                onClick={() => setMappingPage(0)}
              >
                <ChevronLeft sx={{ fontSize: '1.1rem' }} />
              </PagerArrow>
              <PagerLabel>
                Page {mappingPage + 1} of 2 · {mappingPage === 0 ? 'XY' : 'Z depth'}
              </PagerLabel>
              <PagerArrow
                type="button"
                aria-label="Next mapping page"
                title="XZ map"
                disabled={mappingPage === 1}
                onClick={() => setMappingPage(1)}
              >
                <ChevronRight sx={{ fontSize: '1.1rem' }} />
              </PagerArrow>
            </PagerBar>
          ) : null}
        </MappingWidthFloor>
      </MappingScrollRegion>

      <BottomInspectorScroll>
        {activeFixture !== null ? (
          <Inspector>
            <InspectorTitle>
              Selected fixture · position
              {!selectedFixtureIsMover ? ', rotation' : ''} and groups
            </InspectorTitle>
            <InspectorCompactRow>
              <InspectorFields>
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
                    val={Number(displayVal.toFixed(2))}
                    label={`${AXIS_LABEL[axis]} (${stage.unit})`}
                    numberType="float"
                    step={snapStepDisplay}
                    min={0}
                    max={axisMaxDisplay}
                    variant="outlined"
                    stageUnit={stage.unit}
                    onChange={(newVal) => setFixtureAxisFromInput(axis, newVal)}
                    title={`${AXIS_LABEL[axis]} position (${stage.unit})`}
                    sx={inspectorCompactFieldSx}
                  />
                )
              })}
              {!selectedFixtureIsMover &&
                rotationAxes.map((axis) => (
                  <NumberField
                    key={`rotation-${axis}`}
                    val={Number(rotationAngle(axis).toFixed(1))}
                    label={`Rot ${AXIS_LABEL[axis]} (°)`}
                    numberType="float"
                    step={0.1}
                    min={-360}
                    max={360}
                    variant="outlined"
                    onChange={(newVal) => setFixtureRotationAxis(axis, newVal)}
                    sx={inspectorCompactFieldSx}
                  />
                ))}
              </InspectorFields>
              <InspectorGroupsBlock>
                {groupsModalFixture !== null &&
                groupsModalFixture.groups.length > 0 ? (
                  <InspectorGroupsSummary
                    title={groupsModalFixture.groups.join(', ')}
                  >
                    {groupsModalFixture.groups.join(', ')}
                  </InspectorGroupsSummary>
                ) : (
                  <InspectorGroupsSummary $muted>No groups assigned</InspectorGroupsSummary>
                )}
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setFixtureGroupsModalOpen(true)}
                >
                  Groups…
                </Button>
              </InspectorGroupsBlock>
            </InspectorCompactRow>
            {groupsModalFixture !== null ? (
              <FixtureGroupsModal
                open={fixtureGroupsModalOpen}
                fixtureLabel={groupsModalFixture.label}
                selectedGroups={groupsModalFixture.groups}
                availableGroups={availableFixtureGroups}
                onClose={() => setFixtureGroupsModalOpen(false)}
                onSave={(groups) => {
                  dispatch(
                    setFixtureGroups({
                      index: groupsModalFixture.index,
                      groups,
                    })
                  )
                  setFixtureGroupsModalOpen(false)
                }}
              />
            ) : null}
          </Inspector>
        ) : (
          <Inspector>
            <InspectorTitle>No fixture selected</InspectorTitle>
          </Inspector>
        )}
      </BottomInspectorScroll>
    </Root>
  )
}

const Root = styled.div`
  background-color: #0008;
  overflow: hidden;
  padding: 0.5rem;
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
`

const TopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  flex: 0 0 auto;
`

const MappingScrollRegion = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  overflow-x: auto;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #7a7a7a99 #0000;

  &::-webkit-scrollbar {
    display: block !important;
    width: 10px;
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

const MappingWidthFloor = styled.div`
  width: 100%;
  min-width: ${MAPPING_CONTENT_MIN_WIDTH};
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`

const PagerBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.2rem 0 0.15rem;
  flex: 0 0 auto;
`

const PagerArrow = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.35rem;
  border: 1px solid #ffffff38;
  background: #0a0e18cc;
  color: #e8ecf7;
  cursor: pointer;

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }

  &:not(:disabled):hover {
    border-color: #ffffff66;
    background: #121826ee;
  }
`

const PagerLabel = styled.div`
  font-size: 0.72rem;
  font-weight: 600;
  color: ${(props) => props.theme.colors.text.secondary};
  min-width: 9rem;
  text-align: center;
`

const BottomInspectorScroll = styled.div`
  flex: 0 1 auto;
  min-height: 0;
  max-height: min(40vh, 20rem);
  width: 100%;
  overflow-x: auto;
  overflow-y: auto;
  padding-top: 0.35rem;
  margin-top: 0.1rem;
  border-top: 1px solid #ffffff1a;
  scrollbar-width: thin;
  scrollbar-color: #7a7a7a99 #0000;

  &::-webkit-scrollbar {
    display: block !important;
    width: 10px;
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

const TitleCluster = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
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

const DepthToggle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  user-select: none;
`

const DepthToggleLabel = styled.span`
  font-size: 0.74rem;
  color: ${(props) => props.theme.colors.text.secondary};
  white-space: nowrap;
`

const SnapGridControl = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.74rem;
  color: ${(props) => props.theme.colors.text.secondary};
  user-select: none;
`

const SnapGridLabel = styled.label`
  white-space: nowrap;
`

const SnapGridSelect = styled.select`
  font-size: 0.74rem;
  color: ${(props) => props.theme.colors.text.primary};
  background: ${(props) => props.theme.colors.bg.darker};
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.25rem;
  padding: 0.2rem 0.35rem;
  min-width: 5.5rem;
  cursor: pointer;
`

const PadCard = styled.div`
  width: 100%;
  border: 1px solid #ffffff22;
  border-radius: 0.35rem;
  background: #070a1299;
  padding: 0.35rem 0.35rem 0.4rem;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
`

const PadTitle = styled.div`
  font-size: 0.74rem;
  color: ${(props) => props.theme.colors.text.secondary};
  margin-bottom: 0.28rem;
`

const PadBodyRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0.28rem;
  min-width: 0;
`

const LeftAxisLabel = styled.div`
  flex: 0 0 1.5rem;
  width: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
`

const LeftAxisLabelText = styled.span`
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  text-orientation: mixed;
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: ${(props) => props.theme.colors.text.secondary};
  line-height: 1.2;
  white-space: nowrap;
`

const PadPlotColumn = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.22rem;
`

const BottomAxisLabel = styled.div`
  flex: 0 0 auto;
  text-align: center;
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: ${(props) => props.theme.colors.text.secondary};
  padding: 0 0.25rem;
`

const PadRoot = styled.div<{ $aspectRatio: number }>`
  position: relative;
  isolation: isolate;
  z-index: ${canvasLayerZIndex.grid};
  width: 100%;
  box-sizing: border-box;
  aspect-ratio: ${(props) => props.$aspectRatio} / 1;
  min-height: 11rem;
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

const Inspector = styled.div`
  border: 1px solid #ffffff22;
  border-radius: 0.35rem;
  background: #070a1299;
  padding: 0.45rem;
  box-sizing: border-box;
  min-width: min(100%, 16rem);
`

const InspectorTitle = styled.div`
  font-size: 0.74rem;
  color: ${(props) => props.theme.colors.text.secondary};
  margin-bottom: 0.35rem;
`

/** Narrow numeric fields (~3 digits) for fixture position / rotation in one row. */
const InspectorCompactRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.4rem 0.65rem;
  width: 100%;
`

const InspectorFields = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.4rem;
  flex: 1 1 auto;
  min-width: 0;
`

const InspectorGroupsBlock = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.45rem;
  flex: 0 1 auto;
  min-width: min(100%, 10rem);
  max-width: min(100%, 18rem);
  margin-left: auto;
`

const InspectorGroupsSummary = styled.div<{ $muted?: boolean }>`
  font-size: 0.74rem;
  color: ${(p) =>
    p.$muted ? p.theme.colors.text.secondary : p.theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1 1 auto;
  min-width: 0;
  text-align: right;
`

const inspectorCompactFieldSx = {
  width: '5.1rem',
  maxWidth: '5.1rem',
  flex: '0 0 auto',
  '& .MuiInputBase-input': {
    padding: '5px 6px',
    fontSize: '0.8rem',
    textAlign: 'right',
  },
  '& .MuiInputLabel-root': {
    fontSize: '0.7rem',
  },
} as const
