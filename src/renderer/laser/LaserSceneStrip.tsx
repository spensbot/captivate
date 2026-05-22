import { nanoid } from 'nanoid'
import { useEffect, useRef, useState } from 'react'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import AddIcon from '@mui/icons-material/Add'
import styled, { css, keyframes } from 'styled-components'
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import type { LaserScene, LaserAutoScene } from './laserEditorTypes'
import type { LaserShapeLayer } from './laserEditorTypes'
import {
  LASER_SCENE_THUMB_GAP_PX,
  LASER_SCENE_THUMB_WIDTH_REM,
} from './laserLayoutConstants'
import {
  measureLaserSceneGridLayout,
  type LaserSceneGridLayout,
} from './laserSceneGridLayout'
import { sampleSplinePolyline } from './laserEditorSpline'
import { sceneHasAnimatedContent } from './laserEditorSceneUtils'
import { getLaserSceneDisplayLayers } from './laserSceneDisplay'

export interface LaserSceneStripProps {
  scenes: LaserScene[]
  activeSceneId: string | null
  /** Active scene (for auto-advance controls in the strip header). */
  activeScene: LaserScene | null
  onPatchActiveScene: (patch: Partial<LaserScene>) => void
  /** Fired when the strip measures how many thumbnails fit per page. */
  onGridLayout?: (layout: LaserSceneGridLayout) => void
  onSelectScene: (id: string) => void
  onAddScene: () => void
  page: number
  onPageChange: (page: number) => void
  onReorderScenes?: (fromGlobalIndex: number, toGlobalIndex: number) => void
}

function ThumbnailSvg({ scene }: { scene: LaserScene }) {
  const layers = getLaserSceneDisplayLayers(scene, undefined, 0.5)
  return (
    <ThumbSvg viewBox="0 0 1 1" preserveAspectRatio="xMidYMid meet">
      <rect width="1" height="1" fill="#0a0a0a" />
      {layers.map((layer) => (
        <g key={layer.id}>{thumbLayer(layer)}</g>
      ))}
    </ThumbSvg>
  )
}

function thumbLayer(layer: LaserShapeLayer) {
  const { kind, color, points, text } = layer
  const sw = 0.008
  if (!points?.length) return null
  if (points.length < 2 && kind !== 'poly') return null
  switch (kind) {
    case 'line':
      return (
        <line
          x1={points[0].x}
          y1={points[0].y}
          x2={points[1].x}
          y2={points[1].y}
          stroke={color}
          strokeWidth={sw}
          vectorEffect="non-scaling-stroke"
        />
      )
    case 'freehand':
      return (
        <polyline
          fill="none"
          stroke={color}
          strokeWidth={sw}
          vectorEffect="non-scaling-stroke"
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
        />
      )
    case 'rect': {
      const x0 = Math.min(points[0].x, points[1].x)
      const y0 = Math.min(points[0].y, points[1].y)
      const w = Math.abs(points[1].x - points[0].x)
      const h = Math.abs(points[1].y - points[0].y)
      return (
        <rect
          x={x0}
          y={y0}
          width={w}
          height={h}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          vectorEffect="non-scaling-stroke"
        />
      )
    }
    case 'circle': {
      const cx = points[0].x
      const cy = points[0].y
      const r = Math.hypot(points[1].x - cx, points[1].y - cy)
      return (
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          vectorEffect="non-scaling-stroke"
        />
      )
    }
    case 'poly':
      if (points.length < 3) return null
      return (
        <polygon
          fill="none"
          stroke={color}
          strokeWidth={sw}
          vectorEffect="non-scaling-stroke"
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
        />
      )
    case 'spline': {
      const s = sampleSplinePolyline(points, 12)
      if (s.length < 2) return null
      return (
        <polyline
          fill="none"
          stroke={color}
          strokeWidth={sw}
          vectorEffect="non-scaling-stroke"
          points={s.map((p) => `${p.x},${p.y}`).join(' ')}
        />
      )
    }
    case 'text': {
      if (points.length < 2) return null
      const x0 = Math.min(points[0].x, points[1].x)
      const y0 = Math.min(points[0].y, points[1].y)
      const y1 = Math.max(points[0].y, points[1].y)
      const fs = Math.max(0.02, Math.min(0.09, (y1 - y0) * 0.65))
      const label = text ?? 'Text'
      return (
        <text
          x={x0 + 0.01}
          y={y0 + fs * 0.85}
          fill={color}
          fontSize={fs}
          fontFamily="system-ui, sans-serif"
        >
          {label}
        </text>
      )
    }
    default:
      return null
  }
}

export default function LaserSceneStrip({
  scenes,
  activeSceneId,
  activeScene,
  onPatchActiveScene,
  onGridLayout,
  onSelectScene,
  onAddScene,
  page,
  onPageChange,
  onReorderScenes,
}: LaserSceneStripProps) {
  const gridHostRef = useRef<HTMLDivElement | null>(null)
  const [gridLayout, setGridLayout] = useState<LaserSceneGridLayout>(() =>
    measureLaserSceneGridLayout(400, 120)
  )

  useEffect(() => {
    const host = gridHostRef.current
    if (!host) return

    const update = () => {
      const next = measureLaserSceneGridLayout(
        host.clientWidth,
        host.clientHeight
      )
      setGridLayout((prev) =>
        prev.cols === next.cols &&
        prev.rows === next.rows &&
        prev.perPage === next.perPage
          ? prev
          : next
      )
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(host)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    onGridLayout?.(gridLayout)
  }, [gridLayout, onGridLayout])

  const { cols: gridCols, rows: gridRows, perPage: scenesPerPage } = gridLayout

  const pageCount = Math.max(
    1,
    Math.ceil((scenes.length + 1) / scenesPerPage)
  )
  const safePage = Math.min(Math.max(0, page), pageCount - 1)

  useEffect(() => {
    if (page > pageCount - 1) {
      onPageChange(Math.max(0, pageCount - 1))
    }
  }, [page, pageCount, onPageChange])

  const start = safePage * scenesPerPage

  const slots = Array.from({ length: scenesPerPage }, (_, i) => {
    const idx = start + i
    if (idx < scenes.length) {
      return { type: 'scene' as const, scene: scenes[idx], idx }
    }
    if (idx === scenes.length) {
      return { type: 'add' as const, idx }
    }
    return { type: 'pad' as const, idx }
  })

  const goPrev = () => onPageChange(Math.max(0, safePage - 1))
  const goNext = () => onPageChange(Math.min(pageCount - 1, safePage + 1))

  const auto = activeScene?.autoScene
  const patchAuto = (part: Partial<LaserAutoScene>) => {
    if (!activeScene) return
    const cur = { enabled: false, periodBeats: 16, ...activeScene.autoScene, ...part }
    onPatchActiveScene({ autoScene: cur })
  }

  const onDragEnd = (result: DropResult) => {
    if (!onReorderScenes) return
    if (!result.destination) return
    const src = slots[result.source.index]
    const dst = slots[result.destination.index]
    if (src.type !== 'scene' || dst.type !== 'scene') return
    if (src.idx === dst.idx) return
    onReorderScenes(src.idx, dst.idx)
  }

  const gridBody = (
    <Droppable droppableId="laserSceneStrip" direction="horizontal">
      {(dropProvided) => (
        <ThumbGrid
          ref={dropProvided.innerRef}
          {...dropProvided.droppableProps}
          $cols={gridCols}
          $rows={gridRows}
        >
          {slots.map((slot, gridIdx) => {
            const dragId =
              slot.type === 'scene'
                ? slot.scene.id
                : slot.type === 'add'
                  ? `add-slot-${slot.idx}`
                  : `pad-slot-${slot.idx}`
            const dragDisabled = slot.type !== 'scene'
            return (
              <Draggable
                key={dragId}
                draggableId={dragId}
                index={gridIdx}
                isDragDisabled={dragDisabled}
              >
                {(dp) => {
                  const dragStyle = dp.draggableProps.style
                  if (slot.type === 'pad') {
                    return (
                      <PadCell
                        ref={dp.innerRef}
                        {...dp.draggableProps}
                        style={dragStyle}
                      />
                    )
                  }
                  if (slot.type === 'add') {
                    return (
                      <EmptySlot
                        ref={dp.innerRef}
                        {...dp.draggableProps}
                        style={dragStyle}
                        type="button"
                        onClick={onAddScene}
                      >
                        <AddIcon fontSize="small" />
                        <EmptyLabel>New</EmptyLabel>
                      </EmptySlot>
                    )
                  }
                  const { scene } = slot
                  const active = scene.id === activeSceneId
                  const animated = sceneHasAnimatedContent(scene)
                  return (
                    <ThumbCell
                      ref={dp.innerRef}
                      {...dp.draggableProps}
                      {...dp.dragHandleProps}
                      style={dragStyle}
                      type="button"
                      $active={active}
                      onClick={() => onSelectScene(scene.id)}
                    >
                      <ThumbName>{scene.name}</ThumbName>
                      <ThumbFrame $animated={animated}>
                        <ThumbnailSvg scene={scene} />
                      </ThumbFrame>
                    </ThumbCell>
                  )
                }}
              </Draggable>
            )
          })}
          {dropProvided.placeholder}
        </ThumbGrid>
      )}
    </Droppable>
  )

  return (
    <StripRoot>
      <StripHeader>
        <HeaderLeft>
          <PagePill>
            <PageArrow type="button" onClick={goPrev} disabled={safePage <= 0}>
              <ChevronLeftIcon fontSize="small" />
            </PageArrow>
            <PageLabel>
              {safePage + 1} / {pageCount}
            </PageLabel>
            <PageArrow
              type="button"
              onClick={goNext}
              disabled={safePage >= pageCount - 1}
            >
              <ChevronRightIcon fontSize="small" />
            </PageArrow>
          </PagePill>
          {activeScene ? (
            <AutoCluster>
              <AutoDivider aria-hidden />
              <AutoLabel>Auto scene</AutoLabel>
              <AutoToggle title="Cycle scenes on the beat bar">
                <input
                  type="checkbox"
                  checked={auto?.enabled === true}
                  onChange={(e) => patchAuto({ enabled: e.target.checked })}
                />
                <span>On beat</span>
              </AutoToggle>
              <AutoPeriod
                type="number"
                min={2}
                max={256}
                step={1}
                title="Beats between random scene changes"
                value={Math.round(auto?.periodBeats ?? 16)}
                disabled={!auto?.enabled}
                onChange={(e) =>
                  patchAuto({
                    periodBeats: Math.max(2, Math.min(256, Number(e.target.value) || 16)),
                  })
                }
              />
            </AutoCluster>
          ) : null}
        </HeaderLeft>
        <StripTitle>Scenes</StripTitle>
      </StripHeader>
      <GridHost ref={gridHostRef}>
        <DragDropContext onDragEnd={onDragEnd}>{gridBody}</DragDropContext>
      </GridHost>
    </StripRoot>
  )
}

export function createEmptyLaserScene(name?: string): LaserScene {
  return {
    id: nanoid(),
    name: name ?? 'Scene',
    contentMode: 'preset',
    presetId: 'horizontal_wave',
    presetUseSplitXY: true,
    presetColor: '#40ffb8',
    presetParams: {},
    layers: [],
    viewportMask: { enabled: false, x: 0.35, y: 0.35, w: 0.22, h: 0.18 },
    viewportMaskLinkSplit: false,
    autoScene: { enabled: false, periodBeats: 16 },
    presetLayerOverrides: {},
  }
}

const StripRoot = styled.div`
  height: 100%;
  min-height: 0;
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.45rem;
  background: ${(p) => p.theme.colors.bg.darker};
  padding: 0.48rem 0.56rem 0.56rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
  box-sizing: border-box;
`

const StripHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  min-width: 0;
`

const AutoCluster = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  flex-wrap: wrap;
  font-size: 0.62rem;
  color: ${(p) => p.theme.colors.text.primary};
`

const AutoDivider = styled.span`
  width: 1px;
  height: 1.25rem;
  background: ${(p) => p.theme.colors.divider};
  margin: 0 0.05rem;
`

const AutoLabel = styled.span`
  font-size: 0.58rem;
  font-weight: 700;
  color: ${(p) => p.theme.colors.text.secondary};
  letter-spacing: 0.03em;
  text-transform: uppercase;
`

const AutoToggle = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.22rem;
  cursor: pointer;
  user-select: none;
`

const AutoPeriod = styled.input`
  width: 3.2rem;
  font-size: 0.62rem;
  padding: 0.12rem 0.22rem;
  border-radius: 0.25rem;
  border: 1px solid ${(p) => p.theme.colors.divider};
  background: ${(p) => p.theme.colors.bg.primary};
  color: ${(p) => p.theme.colors.text.primary};
`

const StripTitle = styled.div`
  font-size: 0.72rem;
  font-weight: 700;
  color: ${(p) => p.theme.colors.text.secondary};
  letter-spacing: 0.04em;
  text-transform: uppercase;
`

const PagePill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 999px;
  padding: 0.1rem 0.28rem;
  background: ${(p) => p.theme.colors.bg.primary};
`

const PageArrow = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: ${(p) => p.theme.colors.text.primary};
  cursor: pointer;
  padding: 0;

  :disabled {
    opacity: 0.35;
    cursor: default;
  }

  &:hover:not(:disabled) {
    background: ${(p) => p.theme.colors.bg.lighter};
  }
`

const PageLabel = styled.span`
  font-size: 0.72rem;
  font-weight: 600;
  min-width: 3.2rem;
  text-align: center;
  color: ${(p) => p.theme.colors.text.primary};
`

const GridHost = styled.div`
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const ThumbGrid = styled.div<{ $cols: number; $rows: number }>`
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  flex: 1 1 0;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(
    ${(p) => p.$cols},
    ${LASER_SCENE_THUMB_WIDTH_REM}rem
  );
  grid-template-rows: repeat(${(p) => p.$rows}, minmax(0, 1fr));
  column-gap: ${LASER_SCENE_THUMB_GAP_PX}px;
  row-gap: ${LASER_SCENE_THUMB_GAP_PX}px;
  justify-content: start;
  align-content: start;
  align-items: stretch;
`

const ThumbCell = styled.button<{ $active: boolean }>`
  position: relative;
  border-radius: 0.35rem;
  border: 1px solid
    ${(p) => (p.$active ? '#6cb8ff' : p.theme.colors.divider)};
  background: ${(p) =>
    p.$active ? 'rgba(45, 114, 168, 0.22)' : p.theme.colors.bg.primary};
  padding: 0;
  cursor: grab;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  width: 100%;
  max-width: ${LASER_SCENE_THUMB_WIDTH_REM}rem;
  text-align: left;
  transition:
    border-color 0.15s ease,
    transform 0.18s ease;

  &:active {
    cursor: grabbing;
  }

  &:hover {
    border-color: #8ac4f0;
    transform: scale(1.02);
  }
`

const ThumbName = styled.div`
  position: absolute;
  top: 0.22rem;
  left: 0.28rem;
  z-index: 1;
  font-size: 0.62rem;
  font-weight: 700;
  color: #f0f4ff;
  text-shadow: 0 1px 2px #000a;
  max-width: calc(100% - 0.5rem);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
`

const laserThumbHue = keyframes`
  from {
    filter: hue-rotate(0deg);
  }
  to {
    filter: hue-rotate(360deg);
  }
`

const ThumbFrame = styled.div<{ $animated?: boolean }>`
  flex: 1 1 auto;
  min-height: 0;
  background: #000;

  ${(p) =>
    p.$animated
      ? css`
          &:hover {
            animation: ${laserThumbHue} 2.4s linear infinite;
          }
        `
      : css``}
`

const ThumbSvg = styled.svg`
  width: 100%;
  height: 100%;
  display: block;
`

const EmptySlot = styled.button`
  border-radius: 0.35rem;
  border: 1px dashed ${(p) => p.theme.colors.divider};
  background: ${(p) => p.theme.colors.bg.primary};
  height: 100%;
  min-height: 0;
  width: 100%;
  max-width: ${LASER_SCENE_THUMB_WIDTH_REM}rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  color: ${(p) => p.theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    border-color: #8ac4f0;
    color: ${(p) => p.theme.colors.text.primary};
  }
`

const EmptyLabel = styled.span`
  font-size: 0.62rem;
`

const PadCell = styled.div`
  border-radius: 0.35rem;
  border: 1px solid transparent;
  height: 100%;
  min-height: 0;
  width: 100%;
  max-width: ${LASER_SCENE_THUMB_WIDTH_REM}rem;
  background: transparent;
`
