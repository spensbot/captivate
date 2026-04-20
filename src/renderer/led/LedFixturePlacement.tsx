import styled from 'styled-components'
import useDragMapped, { MappedPos } from 'renderer/hooks/useDragMapped'
import { useDispatch } from 'react-redux'
import { useControlSelector, useDmxSelector } from 'renderer/redux/store'
import { distanceBetween, Point } from 'math/point'
import {
  updateActiveLedFixture,
} from 'renderer/redux/dmxSlice'
import { secondaryEnabled } from 'renderer/base/keyUtil'
import LedFixturePoints from './LedFixturePoints'
import Cursor from 'renderer/base/Cursor'
import {
  LedCurveHandle,
  WLedGridFixture,
  WLedStringFixture,
  getLedStringPlacementStats,
  getLedValues,
  normalizeLedFixtureForRuntime,
  WLedStringDrawMode,
} from 'shared/ledFixtures'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRealtimeSelector } from 'renderer/redux/realtimeStore'
import { fromFeet, stageAxisLengthFt } from 'shared/stage'
import { SplitScene_t } from 'shared/Scenes'
import { fixtureGroupsMatchSceneGroups } from 'shared/sceneGroups'

type CanvasViewMode = 'xy' | 'xz'

interface Props {}

const SNAP_STEP = 0.02
const CANVAS_MARGIN_PX = 18
const FREEFORM_MIN_POINT_DISTANCE = 0.0035
const DEFAULT_CURVE_HANDLE = 0.04
const TOOL_OPTIONS: WLedStringDrawMode[] = [
  'freeform',
  'line',
  'polyline',
  'curve',
]

const TOOL_LABEL: Record<WLedStringDrawMode, string> = {
  freeform: 'Free Hand',
  line: 'Line',
  polyline: 'Polyline',
  curve: 'Curve',
}

type CurveHandleSide = 'in' | 'out'

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0.5
  return Math.min(1, Math.max(0, value))
}

function snapToGrid(value: number) {
  return clamp01(Math.round(value / SNAP_STEP) * SNAP_STEP)
}

function snapPoint(point: Point): Point {
  return {
    x: snapToGrid(point.x),
    y: snapToGrid(point.y),
  }
}

function isSecondaryAction(e: MouseEvent) {
  // Support the documented right-click workflow, while keeping Ctrl/Cmd-click.
  return e.button === 2 || secondaryEnabled(e)
}

function buildGridStops(axisLengthFt: number): number[] {
  const safeLength = Math.max(1, axisLengthFt)
  const wholeFeet = Math.max(1, Math.round(safeLength))
  const stride = Math.max(1, Math.ceil(wholeFeet / 24))
  const stops: number[] = []

  for (let value = 0; value <= wholeFeet; value += stride) {
    stops.push(value / wholeFeet)
  }

  if (!stops.includes(0)) stops.push(0)
  if (!stops.includes(1)) stops.push(1)
  return Array.from(new Set(stops)).sort((a, b) => a - b)
}

export default function LedFixturePlacement({}: Props) {
  const activeLedFixtureIndex = useDmxSelector((dmx) => dmx.led.activeFixture)
  const activeLedFixture = useDmxSelector((dmx) =>
    activeLedFixtureIndex === null ? null : dmx.led.ledFixtures[activeLedFixtureIndex]
  )
  const stage = useDmxSelector((dmx) => dmx.stage)
  const activeLightScene = useControlSelector(
    (state) => state.light.byId[state.light.active]
  )
  const master = useControlSelector((state) => state.master)
  const splitStates = useRealtimeSelector((state) => state.splitStates)
  const dispatch = useDispatch()

  const dragPointIndexRef = useRef<number | null>(null)
  const dragHandleRef = useRef<{ index: number; side: CurveHandleSide } | null>(null)
  const freeformDrawingRef = useRef(false)
  const canvasViewportRef = useRef<HTMLDivElement | null>(null)
  const [canvasViewportSize, setCanvasViewportSize] = useState({ width: 1, height: 1 })
  const [viewMode, setViewMode] = useState<CanvasViewMode>('xy')
  const [zoom, setZoom] = useState(1)

  const horizontalAxisLengthFt = Math.max(0.1, stageAxisLengthFt(stage, 'x'))
  const verticalAxisLengthFt = Math.max(
    0.1,
    stageAxisLengthFt(stage, viewMode === 'xy' ? 'y' : 'z')
  )

  useEffect(() => {
    const viewport = canvasViewportRef.current
    if (viewport === null) {
      return
    }

    const updateBounds = () => {
      const rect = viewport.getBoundingClientRect()
      setCanvasViewportSize({
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height)),
      })
    }

    updateBounds()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateBounds)
      return () => {
        window.removeEventListener('resize', updateBounds)
      }
    }

    const observer = new ResizeObserver(updateBounds)
    observer.observe(viewport)
    return () => {
      observer.disconnect()
    }
  }, [])

  const activePixelColors = useMemo(() => {
    if (activeLedFixture === null) return undefined

    const fixture = normalizeLedFixtureForRuntime(activeLedFixture)
    const splitIndex = resolveSplitIndexForFixture(
      fixture.groups,
      activeLightScene?.splitScenes ?? []
    )
    const params =
      splitStates[splitIndex]?.outputParams ?? splitStates[0]?.outputParams
    if (params === undefined) {
      return undefined
    }

    return getLedValues(params, fixture, master).map((color) =>
      `rgb(${Math.round(color.red * 255)}, ${Math.round(color.green * 255)}, ${Math.round(
        color.blue * 255
      )})`
    )
  }, [activeLedFixture, activeLightScene?.splitScenes, splitStates, master])

  const stringPlacementStats =
    activeLedFixture !== null && activeLedFixture.kind === 'string'
      ? getLedStringPlacementStats(
          fixtureWithViewStringPathData(
            activeLedFixture,
            viewMode,
            getFixtureViewStringPathData(activeLedFixture, viewMode)
          )
        )
      : null

  const remainingLengthInStageUnits =
    stringPlacementStats === null
      ? 0
      : fromFeet(
          stringPlacementStats.lengthRemaining * horizontalAxisLengthFt,
          stage.unit
        )

  const horizontalStops = useMemo(
    () => buildGridStops(horizontalAxisLengthFt),
    [horizontalAxisLengthFt]
  )
  const verticalStops = useMemo(
    () => buildGridStops(verticalAxisLengthFt),
    [verticalAxisLengthFt]
  )

  const fitAspect = horizontalAxisLengthFt / verticalAxisLengthFt
  const viewportWidth = Math.max(160, canvasViewportSize.width)
  const viewportHeight = Math.max(140, canvasViewportSize.height)
  const viewportAspect = viewportWidth / viewportHeight

  const usableViewportWidth = Math.max(80, viewportWidth - CANVAS_MARGIN_PX * 2)
  const usableViewportHeight = Math.max(80, viewportHeight - CANVAS_MARGIN_PX * 2)

  const baseWidthPx =
    viewportAspect > fitAspect
      ? usableViewportHeight * fitAspect
      : usableViewportWidth
  const baseHeightPx =
    viewportAspect > fitAspect
      ? usableViewportHeight
      : usableViewportWidth / fitAspect

  const canvasWidthPx = Math.max(240, Math.round(baseWidthPx * zoom))
  const canvasHeightPx = Math.max(240, Math.round(baseHeightPx * zoom))
  const canvasHostWidthPx = Math.max(
    canvasWidthPx + CANVAS_MARGIN_PX * 2,
    viewportWidth
  )
  const canvasHostHeightPx = Math.max(
    canvasHeightPx + CANVAS_MARGIN_PX * 2,
    viewportHeight
  )
  const activeStringDrawMode =
    activeLedFixture?.kind === 'string' ? activeLedFixture.draw_mode : null

  useEffect(() => {
    dragPointIndexRef.current = null
    dragHandleRef.current = null
    freeformDrawingRef.current = false
  }, [activeLedFixture?.id, activeLedFixture?.kind, activeStringDrawMode])

  function updateFixtureDrawMode(mode: WLedStringDrawMode) {
    if (activeLedFixture === null || activeLedFixture.kind !== 'string') {
      return
    }

    dragPointIndexRef.current = null
    dragHandleRef.current = null
    freeformDrawingRef.current = false

    dispatch(
      updateActiveLedFixture({
        ...activeLedFixture,
        draw_mode: mode,
      })
    )
  }

  const [dragContainer, onMouseDown] = useDragMapped((pos, e, status) => {
    if (activeLedFixture === null) {
      dragPointIndexRef.current = null
      dragHandleRef.current = null
      return
    }

    const rawPoint = { x: clamp01(pos.x), y: clamp01(pos.y) }
    const isFreeformTool =
      activeLedFixture.kind === 'string' && activeLedFixture.draw_mode === 'freeform'
    const point = isFreeformTool ? rawPoint : snapPoint(rawPoint)

    if (activeLedFixture.kind === 'grid') {
      if (status === 'Start' || status === 'Moved') {
        dispatch(
          updateActiveLedFixture(
            fixtureWithViewGridAnchor(activeLedFixture, viewMode, point)
          )
        )
      }
      return
    }

    const currentPath = getFixtureViewStringPathData(activeLedFixture, viewMode)
    const currentViewPoints = currentPath.points
    const currentTool = activeLedFixture.draw_mode

    if (status === 'End') {
      dragPointIndexRef.current = null
      dragHandleRef.current = null
      freeformDrawingRef.current = false
      return
    }

    if (status === 'Start') {
      dragPointIndexRef.current = null
      dragHandleRef.current = null
      freeformDrawingRef.current = false

      if (currentTool !== 'freeform' && !isSecondaryAction(e)) {
        const handleHit = findCurveHandleAtPoint(pos, currentPath)
        if (handleHit !== null) {
        dragHandleRef.current = handleHit
          return
        }
      }

      if (currentTool === 'freeform' && !isSecondaryAction(e)) {
        freeformDrawingRef.current = true
        const nextPath = appendPointToPath(currentPath, point, 'freeform')
        dispatch(
          updateActiveLedFixture(
            fixtureWithViewStringPathData(activeLedFixture, viewMode, nextPath)
          )
        )
        return
      }

      const nearbyIndex = isOnPoint(pos, currentViewPoints)
      if (nearbyIndex === null) {
        const nextPath = appendPointToPath(currentPath, point, currentTool)
        dispatch(
          updateActiveLedFixture(
            fixtureWithViewStringPathData(activeLedFixture, viewMode, nextPath)
          )
        )
        if (!isSecondaryAction(e)) {
          dragPointIndexRef.current = nextPath.points.length - 1
        }
      } else if (isSecondaryAction(e)) {
        const nextPath = removePointFromPath(currentPath, nearbyIndex, currentTool)
        dispatch(
          updateActiveLedFixture(
            fixtureWithViewStringPathData(activeLedFixture, viewMode, nextPath)
          )
        )
      } else {
        dragPointIndexRef.current = nearbyIndex
      }
      return
    }

    if (dragHandleRef.current !== null) {
      const nextPath = updateCurveHandleLengthFromPosition(
        currentPath,
        dragHandleRef.current.index,
        dragHandleRef.current.side,
        rawPoint
      )
      dispatch(
        updateActiveLedFixture(
          fixtureWithViewStringPathData(activeLedFixture, viewMode, nextPath)
        )
      )
      return
    }

    if (currentTool === 'freeform' && freeformDrawingRef.current) {
      const livePoints = getFixtureViewStringPoints(activeLedFixture, viewMode)
      const lastPoint = livePoints[livePoints.length - 1]
      if (
        lastPoint === undefined ||
        distanceBetween(lastPoint, point) >= FREEFORM_MIN_POINT_DISTANCE
      ) {
        const nextPath = appendPointToPath(
          getFixtureViewStringPathData(activeLedFixture, viewMode),
          point,
          'freeform'
        )
        dispatch(
          updateActiveLedFixture(
            fixtureWithViewStringPathData(activeLedFixture, viewMode, nextPath)
          )
        )
      }
      return
    }

    if (dragPointIndexRef.current !== null) {
      const nextPath = {
        ...currentPath,
        points: [...currentPath.points],
      }
      nextPath.points[dragPointIndexRef.current] = point
      dispatch(
        updateActiveLedFixture(
          fixtureWithViewStringPathData(activeLedFixture, viewMode, nextPath)
        )
      )
    }
  })

  const clearLayout = () => {
    if (activeLedFixture === null) return

    dragPointIndexRef.current = null
    dragHandleRef.current = null
    freeformDrawingRef.current = false

    if (activeLedFixture.kind === 'grid') {
      dispatch(
        updateActiveLedFixture(
          fixtureWithViewGridAnchor(activeLedFixture, viewMode, {
            x: 0.2,
            y: 0.8,
          })
        )
      )
      return
    }

    const viewPath = getFixtureViewStringPathData(activeLedFixture, viewMode)
    const firstPoint = viewPath.points[0] ?? { x: 0.5, y: 0.5 }
    dispatch(
      updateActiveLedFixture(
        fixtureWithViewStringPathData(
          activeLedFixture,
          viewMode,
          {
            points: [firstPoint],
            segmentModes: [],
            curveHandles: [defaultCurveHandle()],
          }
        )
      )
    )
  }

  const removeLastPoint = () => {
    if (
      activeLedFixture === null ||
      activeLedFixture.kind !== 'string' ||
      getFixtureViewStringPoints(activeLedFixture, viewMode).length <= 1
    ) {
      return
    }

    const viewPath = getFixtureViewStringPathData(activeLedFixture, viewMode)
    dispatch(
      updateActiveLedFixture(
        fixtureWithViewStringPathData(
          activeLedFixture,
          viewMode,
          removePointFromPath(
            viewPath,
            Math.max(0, viewPath.points.length - 1),
            activeLedFixture.draw_mode
          )
        )
      )
    )
  }

  const verticalAxisLabel = viewMode === 'xy' ? 'Y' : 'Z'
  const activeStringPath =
    activeLedFixture !== null && activeLedFixture.kind === 'string'
      ? getFixtureViewStringPathData(activeLedFixture, viewMode)
      : null
  const showNodeCursors =
    activeLedFixture?.kind === 'string' && activeLedFixture.draw_mode !== 'freeform'
  const curveHandleRenderData =
    activeStringPath === null || !showNodeCursors
      ? []
      : getCurveHandleRenderData(activeStringPath)

  return (
    <Root>
      <ToolRibbon>
        <RibbonLeft>
          <HintTitle>Pixel Layout Canvas</HintTitle>
          {activeLedFixture?.kind === 'string' && (
            <ToolButtonRow>
              {TOOL_OPTIONS.map((mode) => (
                <ToolButton
                  key={mode}
                  type="button"
                  $active={activeLedFixture.draw_mode === mode}
                  onClick={() => updateFixtureDrawMode(mode)}
                  title={`Draw mode: ${mode}`}
                >
                  {TOOL_LABEL[mode]}
                </ToolButton>
              ))}
            </ToolButtonRow>
          )}
        </RibbonLeft>
        <RibbonRight>
          <ViewModeLabel>View</ViewModeLabel>
          <ViewToggleButton
            type="button"
            $active={viewMode === 'xy'}
            onClick={() => setViewMode('xy')}
            title="Front view: X/Y"
          >
            XY
          </ViewToggleButton>
          <ViewToggleButton
            type="button"
            $active={viewMode === 'xz'}
            onClick={() => setViewMode('xz')}
            title="Top-down view: X/Z"
          >
            XZ
          </ViewToggleButton>
        </RibbonRight>
      </ToolRibbon>

      <HintBar>
        {activeLedFixture !== null ? (
          <HintText>
            {activeLedFixture.kind === 'grid'
              ? `Grid: left click+drag to place anchor in ${viewMode.toUpperCase()} view.`
              : activeLedFixture.draw_mode === 'freeform'
              ? 'Free Hand: hold left click and drag to draw continuous path without node controls.'
              : 'Line/Polyline/Curve: right click add/remove points, left drag points, and drag curve handles to set radius.'}
          </HintText>
        ) : (
          <HintText>Select an LED fixture on the left to edit pixel mapping.</HintText>
        )}
        <HintText>
          {`Scale: X ${horizontalAxisLengthFt.toFixed(1)} ft | ${verticalAxisLabel} ${verticalAxisLengthFt.toFixed(1)} ft | Snap ${Math.round(
            SNAP_STEP * 100
          )}%`}
        </HintText>
        {activeLedFixture !== null && (
          <Actions>
            <ActionButton type="button" onClick={clearLayout}>
              Clear Layout
            </ActionButton>
            {activeLedFixture.kind === 'string' && (
              <ActionButton
                type="button"
                onClick={removeLastPoint}
                disabled={getFixtureViewStringPoints(activeLedFixture, viewMode).length <= 1}
              >
                Erase Last Point
              </ActionButton>
            )}
          </Actions>
        )}
        {stringPlacementStats !== null && (
          <CoverageText warn={!stringPlacementStats.isComplete}>
            {`Coverage: ${stringPlacementStats.ledsPlaced}/${
              stringPlacementStats.ledsPlaced + stringPlacementStats.ledsRemaining
            } LEDs`}
            {` | Remaining: ${stringPlacementStats.ledsRemaining}`}
            {` | Remaining Distance: ${remainingLengthInStageUnits.toFixed(2)} ${stage.unit}`}
            {!stringPlacementStats.isComplete
              ? ' | Continue drawing to complete the fixture before applying this shape.'
              : ''}
          </CoverageText>
        )}
      </HintBar>

      <CanvasShell ref={canvasViewportRef}>
        <CanvasScroller>
          <CanvasHost
            style={{
              width: `${canvasHostWidthPx}px`,
              height: `${canvasHostHeightPx}px`,
            }}
          >
            <Background
              style={{ width: `${canvasWidthPx}px`, height: `${canvasHeightPx}px` }}
              ref={dragContainer}
              onMouseDown={onMouseDown}
              onContextMenu={(event) => event.preventDefault()}
            >
              {horizontalStops.map((stop) => (
                <GridLineV key={`v-${stop}`} style={{ left: `${stop * 100}%` }} />
              ))}
              {verticalStops.map((stop) => (
                <GridLineH key={`h-${stop}`} style={{ top: `${(1 - stop) * 100}%` }} />
              ))}
              <Vertical />
              <Horizontal />
              {activeLedFixtureIndex !== null && activeLedFixture !== null && (
                <LedFixturePoints
                  fixture={activeLedFixture}
                  isActive={true}
                  pixelColors={activePixelColors}
                  viewMode={viewMode}
                />
              )}
              {activeLedFixtureIndex === null && (
                <EmptyState>Select an LED fixture on the left to edit pixel mapping.</EmptyState>
              )}
              {showNodeCursors &&
                activeStringPath?.points.map((point, index) => {
                  const isStart = index === 0

                  return (
                    <Cursor
                      key={index}
                      x={point.x}
                      y={point.y}
                      radius={0.5}
                      color={isStart ? '#afa' : '#fff'}
                      bgColor={isStart ? '#afa' : undefined}
                    />
                  )
                })}
              {curveHandleRenderData.length > 0 && (
                <CurveHandleSvg viewBox="0 0 1 1" preserveAspectRatio="none">
                  {curveHandleRenderData.map((handle) => (
                    <CurveHandleSvgLine
                      key={`curve-line-${handle.index}-${handle.side}`}
                      x1={handle.nodeX}
                      y1={1 - handle.nodeY}
                      x2={handle.x}
                      y2={1 - handle.y}
                    />
                  ))}
                </CurveHandleSvg>
              )}
              {curveHandleRenderData.map((handle) => (
                <Cursor
                  key={`curve-handle-${handle.index}-${handle.side}`}
                  x={handle.x}
                  y={handle.y}
                  radius={0.32}
                  color="#8cd3ff"
                  bgColor="#8cd3ff"
                />
              ))}
              {activeLedFixture !== null && activeLedFixture.kind === 'grid' && (
                <Cursor
                  x={getFixtureViewGridAnchor(activeLedFixture, viewMode).x}
                  y={getFixtureViewGridAnchor(activeLedFixture, viewMode).y}
                  radius={0.55}
                  color="#ffdb88"
                  bgColor="#ffdb88"
                />
              )}
              <AxisBadge>{`X / ${verticalAxisLabel}`}</AxisBadge>
            </Background>
          </CanvasHost>
        </CanvasScroller>

        <ZoomHud>
          <ZoomLabel>{`Zoom ${Math.round(zoom * 100)}%`}</ZoomLabel>
          <ZoomSlider
            type="range"
            min={1}
            max={4}
            step={0.1}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
        </ZoomHud>
      </CanvasShell>
    </Root>
  )
}

const Root = styled.div`
  padding: 0.65rem;
  height: 100%;
  box-sizing: border-box;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
`

const ToolRibbon = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
`

const RibbonLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
`

const RibbonRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
`

const ViewModeLabel = styled.span`
  font-size: 0.72rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const ViewToggleButton = styled.button<{ $active: boolean }>`
  border: 1px solid ${(props) => (props.$active ? '#7dd3fc' : '#ffffff33')};
  background: ${(props) => (props.$active ? '#0b3250' : '#0007')};
  color: #e8eefc;
  border-radius: 0.25rem;
  padding: 0.16rem 0.42rem;
  font-size: 0.72rem;
  cursor: pointer;
`

const HintBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem 0.8rem;
`

const HintTitle = styled.div`
  font-size: 0.83rem;
  font-weight: 600;
`

const HintText = styled.div`
  font-size: 0.74rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const ToolButtonRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;
`

const ToolButton = styled.button<{ $active: boolean }>`
  border: 1px solid ${(props) => (props.$active ? '#93c5fd' : '#ffffff33')};
  background: ${(props) => (props.$active ? '#11294d' : '#0007')};
  color: #e8eefc;
  border-radius: 0.25rem;
  padding: 0.14rem 0.42rem;
  font-size: 0.72rem;
  cursor: pointer;
`

const Actions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
`

const ActionButton = styled.button`
  border: 1px solid #ffffff33;
  background: #0007;
  color: #e8eefc;
  border-radius: 0.25rem;
  padding: 0.16rem 0.45rem;
  font-size: 0.72rem;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`

const CoverageText = styled.div<{ warn?: boolean }>`
  width: 100%;
  font-size: 0.76rem;
  color: ${(props) => (props.warn ? '#ffd07f' : props.theme.colors.text.secondary)};
`

const CanvasShell = styled.div`
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  position: relative;
  border: 1px solid #2f3b4d;
  background: #0a0d14;
`

const CanvasScroller = styled.div`
  position: absolute;
  inset: 0;
  overflow: auto;
  scrollbar-gutter: stable both-edges;
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

  &::-webkit-scrollbar-corner {
    display: block !important;
    background: #0000;
  }
`

const CanvasHost = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem;
  box-sizing: border-box;
`

const Background = styled.div`
  position: relative;
  border: 1px solid #2f3b4d;
  background-color: #111;
  flex: 0 0 auto;
`

const GridLineV = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background-color: #8aa6d31f;
  transform: translateX(-0.5px);
`

const GridLineH = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background-color: #8aa6d31f;
  transform: translateY(-0.5px);
`

const Vertical = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background-color: #fff3;
`

const Horizontal = styled.div`
  position: absolute;
  top: 50%;
  height: 1px;
  left: 0;
  right: 0;
  background-color: #fff3;
`

const CurveHandleSvg = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
`

const CurveHandleSvgLine = styled.line`
  stroke: #8cd3ff88;
  stroke-width: 0.0032;
  stroke-linecap: round;
`

const AxisBadge = styled.div`
  position: absolute;
  left: 0.35rem;
  top: 0.35rem;
  padding: 0.14rem 0.35rem;
  font-size: 0.66rem;
  border-radius: 0.2rem;
  background: #0009;
  color: #d6e1f5;
`

const ZoomHud = styled.div`
  position: absolute;
  right: 0.65rem;
  bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: #0009;
  border: 1px solid #ffffff2d;
  border-radius: 0.28rem;
  padding: 0.25rem 0.45rem;
  z-index: 2;
`

const ZoomLabel = styled.span`
  font-size: 0.7rem;
  color: #d6e1f5;
  white-space: nowrap;
`

const ZoomSlider = styled.input`
  width: 7rem;
`

const EmptyState = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0.75rem;
  color: ${(props) => props.theme.colors.text.secondary};
  font-size: 0.85rem;
`

function isOnPoint(mappedPos: MappedPos, points: Point[]): number | null {
  const sortedByDistance = points
    .map<[number, number]>((point, index) => [index, distanceBetween(mappedPos, point)])
    .filter(([_index, distance]) => distance < 0.05)
    .sort(([_aIndex, a], [_bIndex, b]) => a - b)

  if (sortedByDistance.length === 0) {
    return null
  }

  return sortedByDistance[0][0]
}

function resolveSplitIndexForFixture(
  fixtureGroups: string[],
  splitScenes: SplitScene_t[]
) {
  if (splitScenes.length === 0) {
    return 0
  }

  for (let i = 0; i < splitScenes.length; i++) {
    if (fixtureGroupsMatchSceneGroups(fixtureGroups, splitScenes[i].groups)) {
      return i
    }
  }

  return 0
}

function getFixtureViewStringPoints(
  fixture: WLedStringFixture,
  viewMode: CanvasViewMode
): Point[] {
  return getFixtureViewStringPathData(fixture, viewMode).points
}

interface StringPathData {
  points: Point[]
  segmentModes: WLedStringDrawMode[]
  curveHandles: LedCurveHandle[]
}

interface CurveHandleRenderData {
  index: number
  side: CurveHandleSide
  nodeX: number
  nodeY: number
  x: number
  y: number
}

function defaultCurveHandle(): LedCurveHandle {
  return { in: DEFAULT_CURVE_HANDLE, out: DEFAULT_CURVE_HANDLE }
}

function normalizeDrawMode(value: unknown): WLedStringDrawMode {
  if (
    value === 'freeform' ||
    value === 'line' ||
    value === 'polyline' ||
    value === 'curve'
  ) {
    return value
  }
  return 'polyline'
}

function normalizeCurveHandleValue(value: unknown): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return DEFAULT_CURVE_HANDLE
  }
  return Math.min(0.5, Math.max(0, numeric))
}

function normalizeSegmentModesLength(
  source: WLedStringDrawMode[] | undefined,
  pointCount: number,
  fallbackMode: WLedStringDrawMode
): WLedStringDrawMode[] {
  if (pointCount < 2) {
    return []
  }
  const output: WLedStringDrawMode[] = []
  for (let i = 0; i < pointCount - 1; i++) {
    output.push(
      normalizeDrawMode(source?.[i] ?? source?.[Math.max(0, (source?.length ?? 1) - 1)] ?? fallbackMode)
    )
  }
  return output
}

function normalizeCurveHandlesLength(
  source: LedCurveHandle[] | undefined,
  pointCount: number
): LedCurveHandle[] {
  if (pointCount <= 0) {
    return []
  }
  const output: LedCurveHandle[] = []
  for (let i = 0; i < pointCount; i++) {
    output.push({
      in: normalizeCurveHandleValue(source?.[i]?.in),
      out: normalizeCurveHandleValue(source?.[i]?.out),
    })
  }
  return output
}

function getFixtureViewStringPathData(
  fixture: WLedStringFixture,
  viewMode: CanvasViewMode
): StringPathData {
  const source =
    viewMode === 'xy'
      ? fixture.points
      : fixture.points_xz ?? fixture.points.map((point) => ({ x: point.x, y: 0.5 }))
  const points = source.map((point) => ({
    x: clamp01(point.x),
    y: clamp01(point.y),
  }))
  const segmentModesSource =
    viewMode === 'xy'
      ? fixture.segment_modes
      : fixture.segment_modes_xz ?? fixture.segment_modes
  const curveHandlesSource =
    viewMode === 'xy'
      ? fixture.curve_handles
      : fixture.curve_handles_xz ?? fixture.curve_handles
  const fallbackMode = normalizeDrawMode(fixture.draw_mode)
  return {
    points,
    segmentModes: normalizeSegmentModesLength(
      segmentModesSource,
      points.length,
      fallbackMode
    ),
    curveHandles: normalizeCurveHandlesLength(curveHandlesSource, points.length),
  }
}

function fixtureWithViewStringPathData(
  fixture: WLedStringFixture,
  viewMode: CanvasViewMode,
  nextPath: StringPathData
): WLedStringFixture {
  const normalizedPoints = nextPath.points.map((point) => ({
    x: clamp01(point.x),
    y: clamp01(point.y),
  }))
  const fallbackMode = normalizeDrawMode(fixture.draw_mode)
  const normalizedModes = normalizeSegmentModesLength(
    nextPath.segmentModes,
    normalizedPoints.length,
    fallbackMode
  )
  const normalizedHandles = normalizeCurveHandlesLength(
    nextPath.curveHandles,
    normalizedPoints.length
  )

  if (viewMode === 'xy') {
    const nextXZ = syncPathXWithCounterpart(
      normalizedPoints,
      fixture.points_xz ?? normalizedPoints
    )
    return {
      ...fixture,
      points: normalizedPoints,
      segment_modes: normalizedModes,
      curve_handles: normalizedHandles,
      points_xz: nextXZ,
      segment_modes_xz: normalizeSegmentModesLength(
        fixture.segment_modes_xz ?? fixture.segment_modes ?? normalizedModes,
        nextXZ.length,
        fallbackMode
      ),
      curve_handles_xz: normalizeCurveHandlesLength(
        fixture.curve_handles_xz ?? fixture.curve_handles ?? normalizedHandles,
        nextXZ.length
      ),
    }
  }
  const nextXY = syncPathXWithCounterpart(normalizedPoints, fixture.points)
  return {
    ...fixture,
    points: nextXY,
    segment_modes: normalizeSegmentModesLength(
      fixture.segment_modes ?? nextPath.segmentModes,
      nextXY.length,
      fallbackMode
    ),
    curve_handles: normalizeCurveHandlesLength(
      fixture.curve_handles ?? nextPath.curveHandles,
      nextXY.length
    ),
    points_xz: normalizedPoints,
    segment_modes_xz: normalizedModes,
    curve_handles_xz: normalizedHandles,
  }
}

function syncPathXWithCounterpart(
  source: Point[],
  counterpart: Point[]
): Point[] {
  const length = Math.max(source.length, counterpart.length)
  const output: Point[] = []
  for (let i = 0; i < length; i++) {
    const sourcePoint = source[Math.min(i, Math.max(0, source.length - 1))]
    const fallback = counterpart[Math.min(i, Math.max(0, counterpart.length - 1))]
    if (sourcePoint === undefined && fallback === undefined) {
      continue
    }
    output.push({
      x: clamp01(sourcePoint?.x ?? fallback?.x ?? 0.5),
      y: clamp01(fallback?.y ?? sourcePoint?.y ?? 0.5),
    })
  }
  return output
}

function appendPointToPath(
  path: StringPathData,
  nextPoint: Point,
  segmentMode: WLedStringDrawMode
): StringPathData {
  const point = {
    x: clamp01(nextPoint.x),
    y: clamp01(nextPoint.y),
  }
  if (path.points.length === 0) {
    return {
      points: [point],
      segmentModes: [],
      curveHandles: [defaultCurveHandle()],
    }
  }
  return {
    points: [...path.points, point],
    segmentModes: [...path.segmentModes, normalizeDrawMode(segmentMode)],
    curveHandles: [...path.curveHandles, defaultCurveHandle()],
  }
}

function removePointFromPath(
  path: StringPathData,
  removeIndex: number,
  fallbackMode: WLedStringDrawMode
): StringPathData {
  if (path.points.length <= 1) {
    return path
  }

  const clampedIndex = Math.max(0, Math.min(path.points.length - 1, removeIndex))
  const nextPoints = path.points.filter((_, index) => index !== clampedIndex)
  const nextHandles = normalizeCurveHandlesLength(
    path.curveHandles.filter((_, index) => index !== clampedIndex),
    nextPoints.length
  )
  const nextModes: WLedStringDrawMode[] = []
  for (let i = 0; i < nextPoints.length - 1; i++) {
    if (i < clampedIndex - 1) {
      nextModes.push(path.segmentModes[i] ?? normalizeDrawMode(fallbackMode))
      continue
    }
    if (i === clampedIndex - 1) {
      nextModes.push(
        path.segmentModes[i] ??
          path.segmentModes[i + 1] ??
          normalizeDrawMode(fallbackMode)
      )
      continue
    }
    nextModes.push(path.segmentModes[i + 1] ?? normalizeDrawMode(fallbackMode))
  }
  return {
    points: nextPoints,
    segmentModes: normalizeSegmentModesLength(
      nextModes,
      nextPoints.length,
      normalizeDrawMode(fallbackMode)
    ),
    curveHandles: nextHandles,
  }
}

function findCurveHandleAtPoint(
  mappedPos: Point,
  path: StringPathData
): { index: number; side: CurveHandleSide } | null {
  const handles = getCurveHandleRenderData(path)
    .map((handle) => ({
      ...handle,
      distance: distanceBetween(mappedPos, handle),
    }))
    .filter((handle) => handle.distance < 0.05)
    .sort((a, b) => a.distance - b.distance)
  if (handles.length === 0) {
    return null
  }
  return {
    index: handles[0].index,
    side: handles[0].side,
  }
}

function updateCurveHandleLengthFromPosition(
  path: StringPathData,
  index: number,
  side: CurveHandleSide,
  point: Point
): StringPathData {
  const node = path.points[index]
  if (node === undefined) {
    return path
  }

  const tangent = getNodeCurveTangent(path, index)
  if (tangent === null) {
    return path
  }

  const sideDirection =
    side === 'in'
      ? { x: -tangent.x, y: -tangent.y }
      : { x: tangent.x, y: tangent.y }
  const toPointer = {
    x: point.x - node.x,
    y: point.y - node.y,
  }
  const sideDot = toPointer.x * sideDirection.x + toPointer.y * sideDirection.y
  const pointerDistance = Math.sqrt(
    toPointer.x * toPointer.x + toPointer.y * toPointer.y
  )
  const previous = path.points[Math.max(0, index - 1)] ?? node
  const next = path.points[Math.min(path.points.length - 1, index + 1)] ?? node
  const localSpan = Math.max(
    distanceBetween(node, previous),
    distanceBetween(node, next)
  )
  const maxLength = Math.min(0.5, localSpan * 1.5)
  const nextLength =
    sideDot <= 0 ? 0 : Math.min(maxLength, Math.max(0, pointerDistance))
  const nextHandles = [...path.curveHandles]
  const current = nextHandles[index] ?? defaultCurveHandle()
  nextHandles[index] = {
    ...current,
    [side]: nextLength,
  }
  return {
    ...path,
    curveHandles: normalizeCurveHandlesLength(nextHandles, path.points.length),
  }
}

function getCurveHandleRenderData(path: StringPathData): CurveHandleRenderData[] {
  const output: CurveHandleRenderData[] = []
  if (path.points.length < 2) {
    return output
  }

  for (let i = 0; i < path.points.length; i++) {
    const node = path.points[i]
    if (node === undefined) continue

    const tangent = getNodeCurveTangent(path, i)
    if (tangent === null) {
      continue
    }

    if (i > 0 && path.segmentModes[i - 1] === 'curve') {
      const length = normalizeCurveHandleValue(path.curveHandles[i]?.in)
      output.push(buildCurveHandleRenderDatum(i, 'in', node, tangent, -length))
    }

    if (i < path.points.length - 1 && path.segmentModes[i] === 'curve') {
      const length = normalizeCurveHandleValue(path.curveHandles[i]?.out)
      output.push(buildCurveHandleRenderDatum(i, 'out', node, tangent, length))
    }
  }

  return output
}

function getNodeCurveTangent(path: StringPathData, index: number): Point | null {
  const node = path.points[index]
  if (node === undefined) {
    return null
  }
  const previous = path.points[index - 1] ?? node
  const next = path.points[index + 1] ?? node

  // Match the same tangent logic used by bezier sampling in shared/ledFixtures:
  // interior uses (next - prev), endpoints use the adjacent segment direction.
  const tangent = normalizeVector({
    x: next.x - previous.x,
    y: next.y - previous.y,
  })
  if (!Number.isFinite(tangent.x) || !Number.isFinite(tangent.y)) {
    return null
  }
  return tangent
}

function buildCurveHandleRenderDatum(
  index: number,
  side: CurveHandleSide,
  node: Point,
  direction: Point,
  distance: number
): CurveHandleRenderData {
  const x = clamp01(node.x + direction.x * distance)
  const y = clamp01(node.y + direction.y * distance)
  return {
    index,
    side,
    nodeX: node.x,
    nodeY: node.y,
    x,
    y,
  }
}

function normalizeVector(point: Point): Point {
  const length = Math.sqrt(point.x * point.x + point.y * point.y)
  if (length <= 0.000001) {
    return { x: 1, y: 0 }
  }
  return {
    x: point.x / length,
    y: point.y / length,
  }
}

function getFixtureViewGridAnchor(
  fixture: WLedGridFixture,
  viewMode: CanvasViewMode
): Point {
  const anchor = viewMode === 'xy' ? fixture.anchor : fixture.anchor_xz ?? fixture.anchor
  return {
    x: clamp01(anchor.x),
    y: clamp01(anchor.y),
  }
}

function fixtureWithViewGridAnchor(
  fixture: WLedGridFixture,
  viewMode: CanvasViewMode,
  nextAnchor: Point
): WLedGridFixture {
  const anchor = {
    x: clamp01(nextAnchor.x),
    y: clamp01(nextAnchor.y),
  }
  if (viewMode === 'xy') {
    return {
      ...fixture,
      anchor,
      anchor_xz: {
        x: anchor.x,
        y: clamp01((fixture.anchor_xz ?? fixture.anchor).y),
      },
    }
  }
  return {
    ...fixture,
    anchor: {
      x: anchor.x,
      y: clamp01(fixture.anchor.y),
    },
    anchor_xz: anchor,
  }
}
