import { nanoid } from 'nanoid'
import Tooltip from '@mui/material/Tooltip'
import NearMeIcon from '@mui/icons-material/NearMe'
import ShowChartIcon from '@mui/icons-material/ShowChart'
import GestureIcon from '@mui/icons-material/Gesture'
import CropSquareIcon from '@mui/icons-material/CropSquare'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import PolylineIcon from '@mui/icons-material/Polyline'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import CleaningServicesIcon from '@mui/icons-material/CleaningServices'
import TimelineIcon from '@mui/icons-material/Timeline'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill'
import GradientIcon from '@mui/icons-material/Gradient'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import styled from 'styled-components'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  BeamGradientStop,
  LaserRgbCapabilities,
  LaserShapeLayer,
  LaserTool,
  LayerBeamStroke,
  NormPoint,
} from './laserEditorTypes'
import { clampPoint, pickLayerAt } from './laserEditorGeometry'
import {
  handleCentersForRender,
  hitTestVertexHandle,
  moveVertexHandle,
  type VertexHandleRef,
} from './laserEditorVertexHandles'
import { gateHexForLaser, gradientPreviewCss } from './laserBeamColor'
import { layerStrokeSvgElements } from './laserLayerElements'
import {
  appendSplineSegment,
  initialSplineFourPoints,
  splineAnchorIndices,
} from './laserEditorSpline'
import {
  findClosestVertexIndex,
  insertVertexInLayer,
  removeVertexFromLayer,
} from './laserPathEdit'

export interface LaserEditorCanvasProps {
  layers: LaserShapeLayer[]
  onLayersChange: (next: LaserShapeLayer[]) => void
  selectedLayerId: string | null
  onSelectLayer: (id: string | null) => void
  tool: LaserTool
  onToolChange: (t: LaserTool) => void
  lineColor: string
  onLineColorChange: (c: string) => void
  laserCapabilities: LaserRgbCapabilities
  beamStrokeMode: 'solid' | 'gradient' | 'rainbow'
  onBeamStrokeModeChange: (m: 'solid' | 'gradient' | 'rainbow') => void
  beamGradientStops: BeamGradientStop[]
  rainbowCycles: number
  onRainbowCyclesChange: (n: number) => void
  onOpenBeamGradientModal: () => void
}

const TOOLS: Array<{ id: LaserTool; label: string; icon: ReactNode }> = [
  { id: 'select', label: 'Select', icon: <NearMeIcon fontSize="small" /> },
  { id: 'line', label: 'Line', icon: <ShowChartIcon fontSize="small" /> },
  { id: 'freehand', label: 'Freehand', icon: <GestureIcon fontSize="small" /> },
  { id: 'rect', label: 'Rectangle', icon: <CropSquareIcon fontSize="small" /> },
  {
    id: 'circle',
    label: 'Circle',
    icon: <RadioButtonUncheckedIcon fontSize="small" />,
  },
  { id: 'poly', label: 'Polygon', icon: <PolylineIcon fontSize="small" /> },
  {
    id: 'spline',
    label: 'Spline (cubic)',
    icon: <TimelineIcon fontSize="small" />,
  },
  {
    id: 'pathAddVertex',
    label: 'Add path vertex',
    icon: <AddCircleOutlineIcon fontSize="small" />,
  },
  {
    id: 'pathRemoveVertex',
    label: 'Remove path vertex',
    icon: <RemoveCircleOutlineIcon fontSize="small" />,
  },
  {
    id: 'eraser',
    label: 'Erase (freehand)',
    icon: <CleaningServicesIcon fontSize="small" />,
  },
]

function swapLayerWithNeighbor(
  list: LaserShapeLayer[],
  index: number,
  delta: -1 | 1
): LaserShapeLayer[] | null {
  const j = index + delta
  if (index < 0 || j < 0 || j >= list.length) {
    return null
  }
  const next = list.slice()
  const t = next[index]!
  next[index] = next[j]!
  next[j] = t
  return next
}

function normFromEvent(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): NormPoint {
  const rect = svg.getBoundingClientRect()
  const x = (clientX - rect.left) / Math.max(1e-6, rect.width)
  const y = (clientY - rect.top) / Math.max(1e-6, rect.height)
  return clampPoint({ x, y })
}

function nearSplineLastAnchor(pts: NormPoint[], p: NormPoint): boolean {
  if (pts.length < 4) return false
  const last = pts[pts.length - 1]
  return Math.hypot(last.x - p.x, last.y - p.y) < 0.048
}

const ERASE_RADIUS = 0.022

export default function LaserEditorCanvas({
  layers,
  onLayersChange,
  selectedLayerId,
  onSelectLayer,
  tool,
  onToolChange,
  lineColor,
  onLineColorChange,
  laserCapabilities,
  beamStrokeMode,
  onBeamStrokeModeChange,
  beamGradientStops,
  rainbowCycles,
  onRainbowCyclesChange,
  onOpenBeamGradientModal,
}: LaserEditorCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const layersRef = useRef(layers)
  layersRef.current = layers

  const [draft, setDraft] = useState<{
    kind: LaserTool
    points: NormPoint[]
  } | null>(null)
  const [dragEnd, setDragEnd] = useState<NormPoint | null>(null)
  const vertexDragRef = useRef<VertexHandleRef | null>(null)
  const eraserDownRef = useRef(false)

  const shouldReplaceSelection =
    selectedLayerId !== null &&
    tool !== 'select' &&
    tool !== 'eraser' &&
    tool !== 'pathAddVertex' &&
    tool !== 'pathRemoveVertex'

  const composeLayerBeam = useCallback((): LayerBeamStroke | undefined => {
    if (beamStrokeMode === 'solid') return undefined
    if (beamStrokeMode === 'rainbow') {
      return { kind: 'rainbow', cycles: Math.max(0.15, rainbowCycles) }
    }
    if (beamGradientStops.length < 2) return undefined
    return { kind: 'gradient', stops: beamGradientStops }
  }, [beamStrokeMode, beamGradientStops, rainbowCycles])

  const putShapeLayer = useCallback(
    (kind: LaserShapeLayer['kind'], points: NormPoint[]) => {
      const cur = layersRef.current
      const beam = composeLayerBeam()
      const colorBase = gateHexForLaser(lineColor, laserCapabilities)
      const applyBeam = (base: LaserShapeLayer): LaserShapeLayer => {
        const next = { ...base }
        if (beam) next.beam = beam
        else delete next.beam
        return next
      }
      if (shouldReplaceSelection && selectedLayerId) {
        onLayersChange(
          cur.map((l) =>
            l.id === selectedLayerId
              ? applyBeam({
                  ...l,
                  kind,
                  points,
                  color: colorBase,
                })
              : l
          )
        )
        onSelectLayer(selectedLayerId)
      } else {
        const id = nanoid()
        const layer: LaserShapeLayer = applyBeam({
          id,
          kind,
          color: colorBase,
          points,
        })
        onLayersChange([...cur, layer])
        onSelectLayer(id)
      }
      setDraft(null)
      setDragEnd(null)
    },
    [
      composeLayerBeam,
      laserCapabilities,
      lineColor,
      onLayersChange,
      onSelectLayer,
      selectedLayerId,
      shouldReplaceSelection,
    ]
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || tool !== 'poly' || draft?.kind !== 'poly') return
      if (draft.points.length < 3) return
      e.preventDefault()
      putShapeLayer('poly', draft.points.map(clampPoint))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tool, draft, putShapeLayer])

  const applyEraseAt = useCallback(
    (p: NormPoint) => {
      const id = selectedLayerId
      if (id === null) return
      const cur = layersRef.current
      let removed = false
      const next = cur.flatMap((l) => {
        if (l.id !== id || l.kind !== 'freehand') return [l]
        const nextPts = l.points.filter(
          (pt) => Math.hypot(pt.x - p.x, pt.y - p.y) > ERASE_RADIUS
        )
        if (nextPts.length < 2) {
          removed = true
          return []
        }
        return [{ ...l, points: nextPts }]
      })
      onLayersChange(next)
      if (removed) {
        onSelectLayer(null)
      }
    },
    [onLayersChange, onSelectLayer, selectedLayerId]
  )

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return
    const p = normFromEvent(svgRef.current, e.clientX, e.clientY)

    if (tool === 'pathAddVertex') {
      if (selectedLayerId === null) return
      const cur = layersRef.current
      const sel = cur.find((l) => l.id === selectedLayerId)
      if (
        !sel ||
        (sel.kind !== 'poly' &&
          sel.kind !== 'freehand' &&
          sel.kind !== 'spline')
      ) {
        return
      }
      const next = insertVertexInLayer(sel, p)
      if (next) {
        onLayersChange(
          cur.map((l) => (l.id === selectedLayerId ? next : l))
        )
      }
      return
    }

    if (tool === 'pathRemoveVertex') {
      if (selectedLayerId === null) return
      const cur = layersRef.current
      const sel = cur.find((l) => l.id === selectedLayerId)
      if (!sel) return
      let vx: number | null = null
      if (sel.kind === 'spline') {
        const ax = splineAnchorIndices(sel.points)
        let bd = 0.03
        for (const i of ax) {
          const d = Math.hypot(sel.points[i].x - p.x, sel.points[i].y - p.y)
          if (d < bd) {
            bd = d
            vx = i
          }
        }
      } else if (sel.kind === 'poly' || sel.kind === 'freehand') {
        vx = findClosestVertexIndex(sel.points, p, 0.03)
      } else {
        return
      }
      if (vx === null) return
      const next = removeVertexFromLayer(sel, vx)
      if (next) {
        onLayersChange(
          cur.map((l) => (l.id === selectedLayerId ? next : l))
        )
      }
      return
    }

    if (tool === 'spline') {
      if (shouldReplaceSelection && selectedLayerId) {
        const sel = layersRef.current.find(
          (l) => l.id === selectedLayerId && l.kind === 'spline'
        )
        if (sel && nearSplineLastAnchor(sel.points, p)) {
          const nextPts = appendSplineSegment(sel.points, p)
          onLayersChange(
            layersRef.current.map((l) =>
              l.id === selectedLayerId ? { ...l, points: nextPts } : l
            )
          )
          return
        }
      }
      setDraft({ kind: 'spline', points: [p] })
      setDragEnd(p)
      return
    }

    if (tool === 'select' && selectedLayerId) {
      const sel = layersRef.current.find((l) => l.id === selectedLayerId)
      if (sel) {
        const h = hitTestVertexHandle(p, sel)
        if (h) {
          vertexDragRef.current = h
          e.currentTarget.setPointerCapture(e.pointerId)
          return
        }
      }
      const hit = pickLayerAt(layersRef.current, p)
      onSelectLayer(hit?.id ?? null)
      return
    }

    if (tool === 'eraser') {
      if (selectedLayerId === null) return
      const layer = layersRef.current.find((l) => l.id === selectedLayerId)
      if (!layer || layer.kind !== 'freehand') return
      eraserDownRef.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
      applyEraseAt(p)
      return
    }

    if (tool === 'poly') {
      if (draft?.kind === 'poly') {
        setDraft({ kind: 'poly', points: [...draft.points, p] })
      } else {
        setDraft({ kind: 'poly', points: [p] })
      }
      return
    }

    if (tool === 'freehand') {
      setDraft({ kind: 'freehand', points: [p] })
      return
    }

    setDraft({ kind: tool, points: [p] })
    setDragEnd(p)
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return
    const p = normFromEvent(svgRef.current, e.clientX, e.clientY)

    if (vertexDragRef.current !== null && selectedLayerId) {
      const cur = layersRef.current
      const layer = cur.find((l) => l.id === selectedLayerId)
      if (!layer) return
      const next = moveVertexHandle(layer, vertexDragRef.current, p)
      onLayersChange(cur.map((l) => (l.id === selectedLayerId ? next : l)))
      return
    }

    if (eraserDownRef.current) {
      applyEraseAt(p)
      return
    }

    if (draft === null) return

    if (draft.kind === 'poly') {
      setDragEnd(clampPoint(p))
      return
    }
    if (draft.kind === 'freehand') {
      setDraft((d) =>
        d ? { ...d, points: [...d.points, clampPoint(p)] } : d
      )
      return
    }
    if (
      draft.kind === 'line' ||
      draft.kind === 'rect' ||
      draft.kind === 'circle' ||
      draft.kind === 'spline'
    ) {
      setDragEnd(clampPoint(p))
    }
  }

  const finishDragShape = () => {
    if (!draft || draft.points.length < 1) return
    const start = draft.points[0]
    const end = dragEnd ?? start
    const a = clampPoint(start)
    const b = clampPoint(end)
    if (Math.hypot(a.x - b.x, a.y - b.y) < 0.004) {
      setDraft(null)
      setDragEnd(null)
      return
    }
    if (draft.kind === 'spline') {
      putShapeLayer('spline', initialSplineFourPoints(a, b))
      return
    }
    if (draft.kind === 'line') {
      putShapeLayer('line', [a, b])
      return
    }
    if (draft.kind === 'rect') {
      putShapeLayer('rect', [a, b])
      return
    }
    if (draft.kind === 'circle') {
      putShapeLayer('circle', [a, b])
      return
    }
  }

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (vertexDragRef.current !== null) {
      vertexDragRef.current = null
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      return
    }
    if (eraserDownRef.current) {
      eraserDownRef.current = false
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      return
    }
    if (draft?.kind === 'freehand' && draft.points.length >= 2) {
      putShapeLayer('freehand', draft.points.map(clampPoint))
      return
    }
    if (
      draft &&
      (draft.kind === 'line' ||
        draft.kind === 'rect' ||
        draft.kind === 'circle' ||
        draft.kind === 'spline')
    ) {
      finishDragShape()
      return
    }
  }

  const onDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (tool !== 'poly' || draft?.kind !== 'poly' || draft.points.length < 3) {
      return
    }
    e.preventDefault()
    putShapeLayer('poly', draft.points.map(clampPoint))
  }

  const draftPreview = () => {
    if (!draft) return null
    if (draft.kind === 'poly') {
      if (draft.points.length === 0) return null
      const pts = [...draft.points]
      if (dragEnd && draft.points.length > 0) pts.push(dragEnd)
      if (pts.length < 2) {
        return (
          <circle
            cx={draft.points[0].x}
            cy={draft.points[0].y}
            r={0.006}
            fill="#b8c4d8"
          />
        )
      }
      return (
        <polyline
          fill="none"
          stroke="#b8c4d8"
          strokeWidth={0.003}
          strokeDasharray="0.012 0.008"
          vectorEffect="non-scaling-stroke"
          points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
        />
      )
    }
    if (
      (draft.kind === 'line' ||
        draft.kind === 'rect' ||
        draft.kind === 'circle' ||
        draft.kind === 'spline') &&
      dragEnd
    ) {
      const temp: LaserShapeLayer = {
        id: '__draft__',
        kind:
          draft.kind === 'line'
            ? 'line'
            : draft.kind === 'rect'
              ? 'rect'
              : draft.kind === 'circle'
                ? 'circle'
                : 'spline',
        color: '#8899aa',
        points:
          draft.kind === 'spline'
            ? initialSplineFourPoints(draft.points[0], dragEnd)
            : [draft.points[0], dragEnd],
      }
      return layerStrokeSvgElements(temp, laserCapabilities, 0.003)
    }
    if (draft.kind === 'freehand' && draft.points.length >= 2) {
      return (
        <polyline
          fill="none"
          stroke={lineColor}
          strokeWidth={0.003}
          opacity={0.65}
          vectorEffect="non-scaling-stroke"
          points={draft.points.map((p) => `${p.x},${p.y}`).join(' ')}
        />
      )
    }
    return null
  }

  const selected = layers.find((l) => l.id === selectedLayerId)
  const selectedIndex =
    selectedLayerId === null
      ? -1
      : layers.findIndex((l) => l.id === selectedLayerId)

  const reorderLayer = (delta: -1 | 1) => {
    if (selectedIndex < 0) return
    const next = swapLayerWithNeighbor(layers, selectedIndex, delta)
    if (next) {
      onLayersChange(next)
    }
  }

  const deleteSelectedLayer = () => {
    if (selectedLayerId === null || selectedIndex < 0) return
    const next = layers.filter((l) => l.id !== selectedLayerId)
    const pickId =
      next.length === 0
        ? null
        : next[Math.min(selectedIndex, next.length - 1)]!.id
    onLayersChange(next)
    onSelectLayer(pickId)
  }

  const handleCenters =
    tool === 'select' && selected ? handleCentersForRender(selected) : []

  const canvasHint = () => {
    if (tool === 'spline') {
      return shouldReplaceSelection
        ? 'Drag new curve or click near last anchor to extend. Replaces selected spline.'
        : 'Drag to place a cubic spline. Select it and click near the end to add anchors.'
    }
    if (tool === 'pathAddVertex') {
      return 'Select poly / freehand / spline, then click on an edge to insert a vertex.'
    }
    if (tool === 'pathRemoveVertex') {
      return 'Select poly / freehand / spline, then click a vertex (spline: anchor only) to remove.'
    }
    if (tool === 'poly') {
      return shouldReplaceSelection
        ? 'Click vertices (replaces selected layer), then double-click or Enter.'
        : 'Click vertices, then double-click or press Enter to close.'
    }
    if (tool === 'select') {
      return 'Click a shape to select. Drag handles to reshape.'
    }
    if (tool === 'eraser') {
      return 'Select a freehand layer, then scrub to remove points.'
    }
    if (shouldReplaceSelection) {
      return 'Draw to replace the selected layer (deselect for a new layer).'
    }
    return 'Drag to draw (freehand: scribble).'
  }

  return (
    <Root>
      <Ribbon>
        {TOOLS.map((t) => (
          <Tooltip key={t.id} title={t.label} placement="bottom">
            <span>
              <RibbonIconButton
                type="button"
                $active={tool === t.id}
                onClick={() => onToolChange(t.id)}
              >
                {t.icon}
              </RibbonIconButton>
            </span>
          </Tooltip>
        ))}
        <RibbonDivider />
        <Tooltip title="Send backward (under previous layer)" placement="bottom">
          <span>
            <RibbonIconButton
              type="button"
              $active={false}
              disabled={selectedIndex <= 0}
              onClick={() => reorderLayer(-1)}
              aria-label="Send layer backward"
            >
              <ArrowUpwardIcon fontSize="small" />
            </RibbonIconButton>
          </span>
        </Tooltip>
        <Tooltip title="Bring forward (over next layer)" placement="bottom">
          <span>
            <RibbonIconButton
              type="button"
              $active={false}
              disabled={
                selectedIndex < 0 || selectedIndex >= layers.length - 1
              }
              onClick={() => reorderLayer(1)}
              aria-label="Bring layer forward"
            >
              <ArrowDownwardIcon fontSize="small" />
            </RibbonIconButton>
          </span>
        </Tooltip>
        <Tooltip title="Delete layer" placement="bottom">
          <span>
            <RibbonIconButton
              type="button"
              $active={false}
              disabled={selectedLayerId === null}
              onClick={deleteSelectedLayer}
              aria-label="Delete layer"
            >
              <DeleteOutlineIcon fontSize="small" />
            </RibbonIconButton>
          </span>
        </Tooltip>
        <RibbonDivider />
        <ColorWrap>
          <RibbonLabel>Beam</RibbonLabel>
          <Tooltip title="Solid color" placement="bottom">
            <span>
              <RibbonIconButton
                type="button"
                $active={beamStrokeMode === 'solid'}
                onClick={() => onBeamStrokeModeChange('solid')}
                aria-label="Solid beam"
              >
                <FormatColorFillIcon fontSize="small" />
              </RibbonIconButton>
            </span>
          </Tooltip>
          <Tooltip title="Gradient along stroke" placement="bottom">
            <span>
              <RibbonIconButton
                type="button"
                $active={beamStrokeMode === 'gradient'}
                onClick={() => onBeamStrokeModeChange('gradient')}
                aria-label="Gradient beam"
              >
                <GradientIcon fontSize="small" />
              </RibbonIconButton>
            </span>
          </Tooltip>
          <Tooltip title="Rainbow along stroke" placement="bottom">
            <span>
              <RibbonIconButton
                type="button"
                $active={beamStrokeMode === 'rainbow'}
                onClick={() => onBeamStrokeModeChange('rainbow')}
                aria-label="Rainbow beam"
              >
                <AutoAwesomeIcon fontSize="small" />
              </RibbonIconButton>
            </span>
          </Tooltip>
          {beamStrokeMode === 'gradient' && (
            <Tooltip title="Edit gradient stops" placement="bottom">
              <span>
                <GradientPreviewBtn
                  type="button"
                  style={{
                    background: gradientPreviewCss(beamGradientStops),
                  }}
                  onClick={onOpenBeamGradientModal}
                />
              </span>
            </Tooltip>
          )}
          {beamStrokeMode === 'rainbow' && (
            <RainbowCyclesField
              title="Rainbow cycles along stroke"
              type="number"
              min={0.15}
              max={16}
              step={0.05}
              value={rainbowCycles}
              onChange={(e) =>
                onRainbowCyclesChange(Number(e.target.value) || 1)
              }
            />
          )}
          <ColorInput
            type="color"
            value={lineColor}
            onChange={(ev) => onLineColorChange(ev.target.value)}
            title="Solid base color"
            disabled={beamStrokeMode !== 'solid'}
          />
        </ColorWrap>
      </Ribbon>
      <CanvasWrap>
        <EditorSvg
          ref={svgRef}
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onDoubleClick={onDoubleClick}
        >
          <GridPattern id="laserGrid" />
          <rect width="1" height="1" fill="url(#laserGrid)" />
          {layers.map((layer) => (
            <g key={layer.id}>
              {layerStrokeSvgElements(
                layer,
                laserCapabilities,
                layer.id === selectedLayerId ? 0.0045 : 0.003
              )}
            </g>
          ))}
          {selected && (
            <g stroke="#ffffffaa" strokeWidth={0.0015} fill="none" opacity={0.9}>
              {outlineBounds(selected)}
            </g>
          )}
          {handleCenters.map((hp, i) => (
            <circle
              key={`h-${i}`}
              cx={hp.x}
              cy={hp.y}
              r={0.014}
              fill="#f2f6ff"
              stroke="#1a2433"
              strokeWidth={0.0012}
              vectorEffect="non-scaling-stroke"
              style={{ pointerEvents: 'none' }}
            />
          ))}
          {draftPreview()}
        </EditorSvg>
        <CanvasHint>{canvasHint()}</CanvasHint>
      </CanvasWrap>
      {selected && (
        <LayerBar>
          <LayerBarLabel>Layer</LayerBarLabel>
          <LayerBarValue>
            {selected.kind} · {selected.id.slice(0, 8)}
            {shouldReplaceSelection ? ' · replace on draw' : ''}
          </LayerBarValue>
        </LayerBar>
      )}
    </Root>
  )
}

function outlineBounds(layer: LaserShapeLayer) {
  const pts = layer.points
  if (pts.length < 1) return null
  let minX = pts[0].x
  let maxX = pts[0].x
  let minY = pts[0].y
  let maxY = pts[0].y
  for (const p of pts) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }
  const pad = 0.012
  minX = Math.max(0, minX - pad)
  maxX = Math.min(1, maxX + pad)
  minY = Math.max(0, minY - pad)
  maxY = Math.min(1, maxY + pad)
  return (
    <rect
      x={minX}
      y={minY}
      width={maxX - minX}
      height={maxY - minY}
      strokeDasharray="0.02 0.015"
    />
  )
}

function GridPattern({ id }: { id: string }) {
  return (
    <defs>
      <pattern
        id={id}
        width="0.05"
        height="0.05"
        patternUnits="userSpaceOnUse"
        patternContentUnits="userSpaceOnUse"
      >
        <path
          d="M 0.05 0 L 0 0 0 0.05"
          fill="none"
          stroke="#c8d0dc"
          strokeWidth={0.0012}
          opacity={0.55}
        />
      </pattern>
    </defs>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1 1 auto;
`

const Ribbon = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.2rem;
  padding: 0.38rem 0.48rem;
  border-bottom: 1px solid ${(p) => p.theme.colors.divider};
  background: ${(p) => p.theme.colors.bg.primary};
  flex-wrap: wrap;
`

const RibbonIconButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.3rem;
  border: 1px solid
    ${(p) => (p.$active ? '#6cb8ff' : p.theme.colors.divider)};
  background: ${(p) =>
    p.$active ? 'rgba(45, 114, 168, 0.35)' : p.theme.colors.bg.darker};
  color: ${(p) => p.theme.colors.text.primary};
  cursor: pointer;
  padding: 0;

  &:hover:not(:disabled) {
    border-color: #8ac4f0;
  }

  &:disabled {
    opacity: 0.35;
    cursor: default;
    border-color: ${(p) => p.theme.colors.divider};
  }
`

const RibbonDivider = styled.div`
  width: 1px;
  height: 1.5rem;
  background: ${(p) => p.theme.colors.divider};
  margin: 0 0.35rem;
`

const ColorWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-left: 0.15rem;
`

const RibbonLabel = styled.span`
  font-size: 0.65rem;
  color: ${(p) => p.theme.colors.text.secondary};
`

const ColorInput = styled.input`
  width: 2.2rem;
  height: 1.75rem;
  padding: 0;
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.28rem;
  background: ${(p) => p.theme.colors.bg.darker};
  cursor: pointer;

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`

const GradientPreviewBtn = styled.button`
  width: 2.4rem;
  height: 1.75rem;
  border-radius: 0.28rem;
  border: 1px solid ${(p) => p.theme.colors.divider};
  cursor: pointer;
  padding: 0;
`

const RainbowCyclesField = styled.input`
  width: 3.2rem;
  font-size: 0.65rem;
  padding: 0.12rem 0.22rem;
  border-radius: 0.25rem;
  border: 1px solid ${(p) => p.theme.colors.divider};
  background: ${(p) => p.theme.colors.bg.darker};
  color: ${(p) => p.theme.colors.text.primary};
`

const CanvasWrap = styled.div`
  position: relative;
  flex: 1 1 auto;
  min-height: 14rem;
  margin: 0.48rem 0.52rem 0.35rem;
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.4rem;
  overflow: hidden;
  background: #000000;
`

const EditorSvg = styled.svg`
  width: 100%;
  height: 100%;
  display: block;
  cursor: crosshair;
  touch-action: none;
`

const CanvasHint = styled.div`
  position: absolute;
  left: 50%;
  bottom: 0.45rem;
  transform: translateX(-50%);
  font-size: 0.65rem;
  color: #a8b4c8cc;
  pointer-events: none;
  text-align: center;
  max-width: 90%;
`

const LayerBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.25rem 0.56rem 0.45rem;
  font-size: 0.68rem;
  border-top: 1px solid ${(p) => p.theme.colors.divider};
`

const LayerBarLabel = styled.span`
  color: ${(p) => p.theme.colors.text.secondary};
`

const LayerBarValue = styled.span`
  color: ${(p) => p.theme.colors.text.primary};
  font-family: ui-monospace, monospace;
`
