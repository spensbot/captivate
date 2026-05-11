import { nanoid } from 'nanoid'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import AddIcon from '@mui/icons-material/Add'
import styled from 'styled-components'
import type { LaserScene } from './laserEditorTypes'
import {
  LASER_SCENES_PER_PAGE,
  LASER_SCENE_GRID_COLS,
} from './laserEditorTypes'
import type { LaserShapeLayer } from './laserEditorTypes'
import { sampleSplinePolyline } from './laserEditorSpline'

export interface LaserSceneStripProps {
  scenes: LaserScene[]
  activeSceneId: string | null
  onSelectScene: (id: string) => void
  onAddScene: () => void
  page: number
  onPageChange: (page: number) => void
}

function ThumbnailSvg({ layers }: { layers: LaserShapeLayer[] }) {
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
  const { kind, color, points } = layer
  const sw = 0.008
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
    default:
      return null
  }
}

export default function LaserSceneStrip({
  scenes,
  activeSceneId,
  onSelectScene,
  onAddScene,
  page,
  onPageChange,
}: LaserSceneStripProps) {
  const pageCount = Math.max(
    1,
    Math.ceil((scenes.length + 1) / LASER_SCENES_PER_PAGE)
  )
  const safePage = Math.min(Math.max(0, page), pageCount - 1)
  const start = safePage * LASER_SCENES_PER_PAGE

  const slots = Array.from({ length: LASER_SCENES_PER_PAGE }, (_, i) => {
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

  return (
    <StripRoot>
      <StripHeader>
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
        <StripTitle>Scenes</StripTitle>
      </StripHeader>
      <ThumbGrid $cols={LASER_SCENE_GRID_COLS}>
        {slots.map((slot) => {
          if (slot.type === 'pad') {
            return <PadCell key={`pad-${slot.idx}`} />
          }
          if (slot.type === 'add') {
            return (
              <EmptySlot
                key={`add-${slot.idx}`}
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
          return (
            <ThumbCell
              key={scene.id}
              type="button"
              $active={active}
              onClick={() => onSelectScene(scene.id)}
            >
              <ThumbName>{scene.name}</ThumbName>
              <ThumbFrame>
                <ThumbnailSvg layers={scene.layers} />
              </ThumbFrame>
            </ThumbCell>
          )
        })}
      </ThumbGrid>
    </StripRoot>
  )
}

export function createEmptyLaserScene(name?: string): LaserScene {
  return {
    id: nanoid(),
    name: name ?? 'Scene',
    layers: [],
  }
}

const StripRoot = styled.div`
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.45rem;
  background: ${(p) => p.theme.colors.bg.darker};
  padding: 0.48rem 0.56rem 0.56rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  flex: 0 0 auto;
`

const StripHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
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

const ThumbGrid = styled.div<{ $cols: number }>`
  display: grid;
  grid-template-columns: repeat(${(p) => p.$cols}, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(4.2rem, 1fr));
  gap: 0.42rem;
`

const ThumbCell = styled.button<{ $active: boolean }>`
  position: relative;
  border-radius: 0.35rem;
  border: 1px solid
    ${(p) => (p.$active ? '#6cb8ff' : p.theme.colors.divider)};
  background: ${(p) =>
    p.$active ? 'rgba(45, 114, 168, 0.22)' : p.theme.colors.bg.primary};
  padding: 0;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 4.2rem;
  text-align: left;

  &:hover {
    border-color: #8ac4f0;
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

const ThumbFrame = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  background: #000;
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
  min-height: 4.2rem;
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
  min-height: 4.2rem;
  background: transparent;
`
