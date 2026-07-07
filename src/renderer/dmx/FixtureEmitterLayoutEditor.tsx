import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type WheelEvent,
} from 'react'
import styled from 'styled-components'
import { Divider, Tooltip } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import GroupWorkIcon from '@mui/icons-material/GroupWork'
import GroupOffIcon from '@mui/icons-material/GroupOff'
import FitScreenIcon from '@mui/icons-material/FitScreen'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd'
import PhotoSizeSelectSmallIcon from '@mui/icons-material/PhotoSizeSelectSmall'
import CropSquareIcon from '@mui/icons-material/CropSquare'
import VerticalAlignCenterIcon from '@mui/icons-material/VerticalAlignCenter'
import AlignHorizontalCenterIcon from '@mui/icons-material/AlignHorizontalCenter'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import NearMeIcon from '@mui/icons-material/NearMe'
import OpenWithIcon from '@mui/icons-material/OpenWith'
import EmitterLayoutHelpButton from './EmitterLayoutHelpButton'
import NumberField from '../base/NumberField'
import { canvasLayerZIndex } from '../zIndexes'
import EmitterSubfixtureChannelPanel from './EmitterSubfixtureChannelPanel'
import { useDmxSelector } from '../redux/store'
import {
  applyAlignHorizontalCenterToReference,
  applyAlignVerticalCenterToReference,
  applyAutoAssignChannelsSequential,
  applyAutoSizeSelectedAtPositions,
  applyDistributeHorizontalBetweenEndpoints,
  applyDistributeVerticalBetweenEndpoints,
  applyGroupSelected,
  applyMatchShapeToReference,
  applyMatchSizeToReference,
  applyUngroupSelected,
  assignSubFixtureToSelected,
  clearChannelsForSelected,
  emitterCenterInNormalizedRect,
  type EditorCanvasTool,
  logicalChannelSelection,
  nudgeSelectedEmitters,
  selectionSubFixtureState,
  selectionTargetIdsForPointer,
  toggleChannelForSelected,
} from './fixtureEmitterLayoutEditorTools'
import {
  FixtureChannel,
  FixtureEmitterDefinition,
  FixtureEmitterShape,
  FixtureModelConfig,
  FixtureType,
  assignEmitterLayoutPositionsInOrder,
  autoResizeEmittersToFitFace,
  bundleSubfixtureChannelsForFixtureModel,
  fitUniformHorizontalLineDiscLayoutToFace,
  type EmitterAutoLayoutKind,
  clampEmitterDiameterM,
  clampRectFaceExtentM,
  EMITTER_DIAMETER_MAX_M,
  EMITTER_DIAMETER_MIN_M,
  fixtureFrontFaceDimensionsM,
  inferFixtureModelKind,
  initFixtureEmitterDefinition,
  layoutEmittersParBoxGrid,
  layoutEmittersParBoxLine,
  layoutEmittersParHoneycomb,
  layoutEmittersParRing,
  normalizeFixtureModelConfig,
  normalizeRectEmitterFaceDimensionsM,
  normalizedParBoxGridEmitterPositions,
  normalizedParBoxLineEmitterPositions,
  normalizedParHoneycombEmitterPositions,
  normalizedParRingEmitterPositions,
} from '../../shared/dmxFixtures'
import { getCustomColorChannelName } from '../../shared/dmxColors'
import { FEET_PER_METER } from '../../shared/stage'
import { clamp } from '../../math/util'
import { nanoid } from 'nanoid'

interface Props {
  fixtureType: FixtureType
  model: FixtureModelConfig
  onChange: (nextModel: FixtureModelConfig) => void
  /** Constrain layout to the hosting modal viewport (scroll regions inside). */
  inModal?: boolean
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.5
  return Math.max(0, Math.min(1, value))
}

const EDITOR_SAFE_PADDING_PERCENT = 12
const CANVAS_ZOOM_MIN = 0.25
const CANVAS_ZOOM_MAX = 3
const CANVAS_ZOOM_STEP = 0.1

type BodyBounds = {
  left: number
  top: number
  width: number
  height: number
  aspect: number
}

/**
 * Insets for the face inside the editor pane. Width and height use the **same**
 * percentage of the pane's width and height so the drawn face keeps the true
 * physical aspect ratio (the pane already has `aspect-ratio: faceW / faceH`).
 */
function computeBodyBounds(
  model: Pick<
    FixtureModelConfig,
    'bodyShape' | 'width' | 'bodyHeight' | 'bodyDiameter' | 'kind'
  >
): BodyBounds {
  const dims = fixtureFrontFaceDimensionsM(model)
  const faceWidth = Math.max(0.05, dims.faceWidthM)
  const faceHeight = Math.max(0.05, dims.faceHeightM)
  const aspect = Math.max(0.2, Math.min(8, faceWidth / faceHeight))

  const margin = EDITOR_SAFE_PADDING_PERCENT
  const span = Math.max(10, 100 - 2 * margin)
  return {
    left: margin,
    top: margin,
    width: span,
    height: span,
    aspect,
  }
}

function shapeLabel(shape: FixtureEmitterShape): string {
  if (shape === 'rect-h') return 'Rect Horizontal'
  if (shape === 'rect-v') return 'Rect Vertical'
  return 'Disc'
}

const SNAP_NORM = 0.022

function snapEmitterXY(
  rawX: number,
  rawY: number,
  bodyShape: FixtureModelConfig['bodyShape'],
  selfId: string,
  others: FixtureEmitterDefinition[],
  shiftKey: boolean
): { x: number; y: number } {
  if (shiftKey) {
    return { x: clamp01(rawX), y: clamp01(rawY) }
  }
  let x = clamp01(rawX)
  let y = clamp01(rawY)
  const t = SNAP_NORM

  const trySnap1d = (v: number, targets: number[]): number => {
    let out = v
    for (const c of targets) {
      if (Math.abs(v - c) < t) {
        out = c
        break
      }
    }
    return out
  }

  const lineTargets = [0, 0.25, 0.5, 0.75, 1, 1 / 3, 2 / 3]
  x = trySnap1d(x, lineTargets)
  y = trySnap1d(y, lineTargets)

  const g = 1 / 8
  const gx = Math.round(x / g) * g
  const gy = Math.round(y / g) * g
  if (Math.abs(gx - x) < t * 0.85) {
    x = gx
  }
  if (Math.abs(gy - y) < t * 0.85) {
    y = gy
  }

  for (const em of others) {
    if (em.id === selfId) {
      continue
    }
    if (Math.abs(x - em.x) < t) {
      x = em.x
    }
    if (Math.abs(y - em.y) < t) {
      y = em.y
    }
  }

  if (bodyShape === 'cylinder') {
    const cx = 0.5
    const cy = 0.5
    const dx = x - cx
    const dy = y - cy
    const r = Math.hypot(dx, dy)
    if (r > t * 0.75) {
      const ang = Math.atan2(dy, dx)
      const step = Math.PI / 12
      const snapped = Math.round(ang / step) * step
      if (Math.abs(ang - snapped) < (t / r) * 1.35) {
        x = clamp01(cx + r * Math.cos(snapped))
        y = clamp01(cy + r * Math.sin(snapped))
      }
    }
  }

  return { x: clamp01(x), y: clamp01(y) }
}

/** Emitter size as % of the face clip (true physical ratio vs. face width / height). */
function emitterVisualSizeBodyRelative(
  emitter: Pick<
    FixtureEmitterDefinition,
    'shape' | 'size' | 'rectWidthM' | 'rectHeightM'
  >,
  faceWidthM: number,
  faceHeightM: number
): { wPct: number; hPct: number; discCircle: boolean } {
  const fw = Math.max(0.001, faceWidthM)
  const fh = Math.max(0.001, faceHeightM)

  if (emitter.shape === 'disc') {
    const d = clampEmitterDiameterM(emitter.size)
    const wPct = (d / fw) * 100
    const hPct = (d / fh) * 100
    const circlePct = Math.min(wPct, hPct)
    return {
      wPct: clamp(circlePct, 0.4, 100),
      hPct: clamp(circlePct, 0.4, 100),
      discCircle: true as const,
    }
  }

  const { widthM, heightM } = normalizeRectEmitterFaceDimensionsM(emitter)
  return {
    wPct: clamp((widthM / fw) * 100, 0.4, 100),
    hPct: clamp((heightM / fh) * 100, 0.4, 100),
    discCircle: false as const,
  }
}

/**
 * Greedy global matching between equal-size sets (emitter count stays small).
 * Returns `assignment[i] = j` meaning emitter i is compared to candidate slot j.
 */
function minCostAssignmentGreedy(
  from: { x: number; y: number }[],
  to: { x: number; y: number }[]
): number[] {
  const n = from.length
  if (n !== to.length) {
    return Array.from({ length: n }, (_, i) => i)
  }
  if (n <= 1) {
    return [0]
  }
  const used = new Set<number>()
  const assignment = new Array<number>(n).fill(-1)
  for (let round = 0; round < n; round++) {
    let bestI = -1
    let bestJ = -1
    let bestD = Infinity
    for (let i = 0; i < n; i++) {
      if (assignment[i] >= 0) continue
      for (let j = 0; j < n; j++) {
        if (used.has(j)) continue
        const d = Math.hypot(from[i].x - to[j].x, from[i].y - to[j].y)
        if (d < bestD) {
          bestD = d
          bestI = i
          bestJ = j
        }
      }
    }
    if (bestI < 0 || bestJ < 0) {
      break
    }
    assignment[bestI] = bestJ
    used.add(bestJ)
  }
  for (let i = 0; i < n; i++) {
    if (assignment[i] < 0) {
      for (let j = 0; j < n; j++) {
        if (!used.has(j)) {
          assignment[i] = j
          used.add(j)
          break
        }
      }
    }
  }
  return assignment
}

function layoutScore(
  current: { x: number; y: number }[],
  candidate: { x: number; y: number }[]
): number {
  if (current.length !== candidate.length || current.length === 0) {
    return Number.POSITIVE_INFINITY
  }
  const assign = minCostAssignmentGreedy(current, candidate)
  let score = 0
  for (let i = 0; i < current.length; i++) {
    const j = assign[i]
    const b = candidate[j]
    score += Math.hypot(current[i].x - b.x, current[i].y - b.y)
  }
  return score
}

function fixtureChannelLabel(channel: FixtureChannel, index: number): string {
  if (channel.type === 'color') {
    return `Ch ${index + 1}: ${getCustomColorChannelName(channel.color)}`
  }
  if (channel.type === 'axis') {
    return `Ch ${index + 1}: ${channel.dir === 'x' ? 'Pan' : 'Tilt'}${channel.isFine ? ' Fine' : ''}`
  }
  if (channel.type === 'master') {
    return `Ch ${index + 1}: Master`
  }
  if (channel.type === 'strobe') {
    return `Ch ${index + 1}: Strobe`
  }
  if (channel.type === 'fxtrTrigger') {
    return `Ch ${index + 1}: ${channel.name || 'FX Trigger'}`
  }
  if (channel.type === 'fxtrLevel') {
    return `Ch ${index + 1}: ${channel.name || 'FX Level'}`
  }
  if (channel.type === 'colorMap') {
    return `Ch ${index + 1}: Color Map`
  }
  if (channel.type === 'goboMap') {
    return `Ch ${index + 1}: Gobo Map`
  }
  if (channel.type === 'focus') {
    return `Ch ${index + 1}: Focus`
  }
  if (channel.type === 'prismMap') {
    return `Ch ${index + 1}: Prism Map`
  }
  if (channel.type === 'split') {
    return `Ch ${index + 1}: Split`
  }
  return `Ch ${index + 1}: ${channel.name || 'Custom'}`
}

const METERS_PER_INCH = 39.37007874007874

export default function FixtureEmitterLayoutEditor({
  fixtureType,
  model,
  onChange,
  inModal = false,
}: Props) {
  const stageUnit = useDmxSelector((state) => state.stage.unit)
  const editorRef = useRef<HTMLDivElement | null>(null)
  const canvasViewportRef = useRef<HTMLDivElement | null>(null)
  const [viewportPx, setViewportPx] = useState({ width: 0, height: 0 })
  const [canvasZoom, setCanvasZoom] = useState(1)
  const snapRef = useRef({
    bodyShape: model.bodyShape,
    emitters: model.customEmitters,
  })
  snapRef.current = { bodyShape: model.bodyShape, emitters: model.customEmitters }
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set())
  const selectionOrderRef = useRef<string[]>([])
  const [editorTool, setEditorTool] = useState<EditorCanvasTool>('move')
  const [marquee, setMarquee] = useState<{
    x0: number
    y0: number
    x1: number
    y1: number
  } | null>(null)
  const marqueeAdditiveRef = useRef(false)
  const [draggingEmitterId, setDraggingEmitterId] = useState<string | null>(null)
  const dragDidMoveRef = useRef(false)
  const dragPointerStartRef = useRef<{ x: number; y: number } | null>(null)
  const dragTargetsRef = useRef<string[]>([])
  const dragSnapshotRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  const DRAG_MOVE_THRESHOLD_PX = 3
  const NUDGE_STEP = 0.008
  const NUDGE_STEP_SHIFT = 0.02

  const selectedIdSet = selectedIds
  const selectionCount = selectedIdSet.size
  const channelSelection = useMemo(
    () => logicalChannelSelection(model.customEmitters, selectedIdSet),
    [model.customEmitters, selectedIdSet]
  )
  const channelEditIds = channelSelection.editIds
  const multiSelectedForChannels = !channelSelection.showAsSingle
  const subFixtureState = useMemo(
    () =>
      selectionSubFixtureState(
        fixtureType,
        model.customEmitters,
        channelEditIds
      ),
    [fixtureType, model.customEmitters, channelEditIds]
  )
  const effectiveKindForFace =
    model.kind === 'auto' ? inferFixtureModelKind(fixtureType) : model.kind
  const bodyBounds = useMemo(
    () =>
      computeBodyBounds({
        ...model,
        kind: effectiveKindForFace,
      }),
    [model, effectiveKindForFace]
  )

  useLayoutEffect(() => {
    const el = canvasViewportRef.current
    if (el === null) {
      return
    }
    const update = () => {
      const rect = el.getBoundingClientRect()
      setViewportPx({
        width: Math.max(0, Math.floor(rect.width)),
        height: Math.max(0, Math.floor(rect.height)),
      })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [inModal])

  const canvasPaneSize = useMemo(() => {
    const aspect = bodyBounds.aspect
    const { width: vw, height: vh } = viewportPx
    if (vw < 16 || vh < 16) {
      return null
    }
    let width = vw
    let height = width / aspect
    if (height > vh) {
      height = vh
      width = height * aspect
    }
    return {
      width: Math.max(120, Math.round(width * canvasZoom)),
      height: Math.max(120, Math.round(height * canvasZoom)),
    }
  }, [bodyBounds.aspect, canvasZoom, viewportPx])

  const adjustCanvasZoom = useCallback((delta: number) => {
    setCanvasZoom((current) => {
      const next = Math.round((current + delta) * 20) / 20
      return Math.max(CANVAS_ZOOM_MIN, Math.min(CANVAS_ZOOM_MAX, next))
    })
  }, [])

  const resetCanvasZoom = useCallback(() => {
    setCanvasZoom(1)
  }, [])

  const onCanvasViewportWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      if (!event.ctrlKey && !event.metaKey) {
        return
      }
      event.preventDefault()
      adjustCanvasZoom(event.deltaY < 0 ? CANVAS_ZOOM_STEP : -CANVAS_ZOOM_STEP)
    },
    [adjustCanvasZoom]
  )
  const editorFaceM = useMemo(
    () =>
      fixtureFrontFaceDimensionsM({
        ...model,
        kind: effectiveKindForFace,
      }),
    [model, effectiveKindForFace]
  )
  const widthUnitLabel = stageUnit === 'ft' ? 'ft' : 'm'
  const faceWidthDisplay =
    stageUnit === 'ft'
      ? editorFaceM.faceWidthM * FEET_PER_METER
      : editorFaceM.faceWidthM
  const faceHeightDisplay =
    stageUnit === 'ft'
      ? editorFaceM.faceHeightM * FEET_PER_METER
      : editorFaceM.faceHeightM
  const bodyWidthDisplay =
    stageUnit === 'ft' ? model.width * FEET_PER_METER : model.width
  const bodyHeightDisplay =
    stageUnit === 'ft' ? model.bodyHeight * FEET_PER_METER : model.bodyHeight
  const bodyDepthDisplay =
    stageUnit === 'ft' ? model.bodyDepth * FEET_PER_METER : model.bodyDepth
  const effectiveKind =
    model.kind === 'auto' ? inferFixtureModelKind(fixtureType) : model.kind
  const isPar = effectiveKind === 'parCan'
  const isParCylinder = isPar && model.bodyShape === 'cylinder'
  const isParBox = isPar && model.bodyShape === 'box'
  const showParLayoutTools = isPar && model.customEmitters.length > 0

  const selectedEmitter = useMemo(() => {
    if (channelSelection.isGroup || selectionCount !== 1) {
      return null
    }
    const onlyId = selectionOrderRef.current.find((id) => selectedIdSet.has(id))
    if (onlyId !== undefined) {
      return model.customEmitters.find((emitter) => emitter.id === onlyId) ?? null
    }
    const id = [...selectedIdSet][0]
    return model.customEmitters.find((emitter) => emitter.id === id) ?? null
  }, [
    channelSelection.isGroup,
    model.customEmitters,
    selectedIdSet,
    selectionCount,
  ])

  const commitSelection = useCallback((ids: string[], order: string[]) => {
    setSelectedIds(new Set(ids))
    selectionOrderRef.current = order
  }, [])

  const applyPointerSelection = useCallback(
    (emitterId: string, additive: boolean) => {
      const current = selectionOrderRef.current.filter((id) =>
        model.customEmitters.some((e) => e.id === id)
      )
      const targetIds = selectionTargetIdsForPointer(
        model.customEmitters,
        emitterId
      )
      const targetSet = new Set(targetIds)
      let nextOrder: string[]
      if (additive) {
        const allTargetsSelected = targetIds.every((id) => current.includes(id))
        if (allTargetsSelected) {
          nextOrder = current.filter((id) => !targetSet.has(id))
        } else {
          nextOrder = [...new Set([...current, ...targetIds])]
        }
      } else {
        nextOrder = targetIds
      }
      commitSelection(nextOrder, nextOrder)
    },
    [commitSelection, model.customEmitters]
  )

  useEffect(() => {
    if (model.customEmitters.length === 0) {
      commitSelection([], [])
      return
    }
    const valid = selectionOrderRef.current.filter((id) =>
      model.customEmitters.some((emitter) => emitter.id === id)
    )
    if (valid.length === 0) {
      commitSelection([model.customEmitters[0]!.id], [model.customEmitters[0]!.id])
      return
    }
    if (valid.length !== selectionOrderRef.current.length) {
      commitSelection(valid, valid)
    }
  }, [commitSelection, model.customEmitters])

  const clientToFaceNormalized = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const editor = editorRef.current
      if (editor === null) {
        return null
      }
      const rect = editor.getBoundingClientRect()
      if (rect.width <= 1 || rect.height <= 1) {
        return null
      }
      const px = ((clientX - rect.left) / rect.width) * 100
      const py = ((clientY - rect.top) / rect.height) * 100
      return {
        x: clamp01((px - bodyBounds.left) / Math.max(0.0001, bodyBounds.width)),
        y: clamp01((py - bodyBounds.top) / Math.max(0.0001, bodyBounds.height)),
      }
    },
    [bodyBounds.height, bodyBounds.left, bodyBounds.top, bodyBounds.width]
  )

  function bundleEmittersToSubfixtureChannels(
    emitters: FixtureEmitterDefinition[]
  ): FixtureEmitterDefinition[] {
    if (fixtureType.subFixtures.length === 0) {
      return emitters
    }
    return bundleSubfixtureChannelsForFixtureModel(fixtureType, model, emitters)
  }

  function updateModelEmitters(nextEmitters: FixtureEmitterDefinition[]) {
    onChange({
      ...model,
      useCustomEmitterLayout: model.useCustomEmitterLayout,
      customEmitters: nextEmitters,
    })
  }

  function updateSelectedEmitters(
    updater: (emitters: FixtureEmitterDefinition[]) => FixtureEmitterDefinition[],
    ids: ReadonlySet<string> = selectedIdSet
  ) {
    if (!model.useCustomEmitterLayout || ids.size === 0) {
      return
    }
    updateModelEmitters(updater(model.customEmitters))
  }

  function updateChannelEditEmitters(
    updater: (emitters: FixtureEmitterDefinition[]) => FixtureEmitterDefinition[]
  ) {
    updateSelectedEmitters(updater, channelEditIds)
  }

  function updateEmitter(
    emitterId: string,
    updater: (current: FixtureEmitterDefinition) => FixtureEmitterDefinition
  ) {
    if (!model.useCustomEmitterLayout) return
    updateModelEmitters(
      model.customEmitters.map((emitter) =>
        emitter.id === emitterId ? updater(emitter) : emitter
      )
    )
  }

  function addEmitter() {
    if (!model.useCustomEmitterLayout) return
    const template =
      selectedEmitter ??
      model.customEmitters[model.customEmitters.length - 1] ??
      null
    let emitter: FixtureEmitterDefinition
    if (template !== null) {
      const nx = clamp01(template.x + 0.045)
      const ny = clamp01(template.y + 0.045)
      emitter = {
        ...template,
        id: nanoid(),
        x: nx > 0.97 ? clamp01(template.x - 0.045) : nx,
        y: ny > 0.97 ? clamp01(template.y - 0.045) : ny,
        channelIndexes: [...template.channelIndexes],
      }
    } else {
      const fallbackChannelIndex = Math.max(
        0,
        Math.min(
          Math.max(0, fixtureType.channels.length - 1),
          model.customEmitters.length
        )
      )
      emitter = initFixtureEmitterDefinition(
        fixtureType.channels.length > 0 ? [fallbackChannelIndex] : []
      )
      emitter.x = 0.5
      emitter.y = 0.5
      emitter.z = 0.65
    }
    updateModelEmitters(
      bundleEmittersToSubfixtureChannels([...model.customEmitters, emitter])
    )
    commitSelection([emitter.id], [emitter.id])
  }

  function removeSelectedEmitters() {
    if (!model.useCustomEmitterLayout) return
    if (selectedIdSet.size === 0) return
    const nextEmitters = model.customEmitters.filter(
      (emitter) => !selectedIdSet.has(emitter.id)
    )
    updateModelEmitters(bundleEmittersToSubfixtureChannels(nextEmitters))
    const nextId = nextEmitters[0]?.id
    commitSelection(nextId !== undefined ? [nextId] : [], nextId !== undefined ? [nextId] : [])
  }

  function hardResetEmitterLayoutFromDefaults() {
    if (!model.useCustomEmitterLayout) return
    const resetModel = normalizeFixtureModelConfig(
      {
        ...model,
        useCustomEmitterLayout: true,
        customEmitters: [],
      },
      fixtureType
    )
    onChange(resetModel)
    const id = resetModel.customEmitters[0]?.id
    commitSelection(id !== undefined ? [id] : [], id !== undefined ? [id] : [])
  }

  function smartAutoGenerateFromNearestLayout() {
    if (!model.useCustomEmitterLayout) return
    const emitters = model.customEmitters
    if (emitters.length === 0) {
      hardResetEmitterLayoutFromDefaults()
      return
    }
    const dims = editorFaceM
    const n = emitters.length
    const current = emitters.map((e) => ({ x: e.x, y: e.y }))

    const candidates: {
      name: string
      positions: { x: number; y: number }[]
    }[] =
      model.bodyShape === 'cylinder'
        ? [
            { name: 'ring', positions: normalizedParRingEmitterPositions(n, editorFaceM.faceWidthM) },
            { name: 'honeycomb', positions: normalizedParHoneycombEmitterPositions(n) },
          ]
        : model.bodyShape === 'box'
        ? [
            {
              name: 'line',
              positions: normalizedParBoxLineEmitterPositions(
                n,
                dims.faceWidthM,
                dims.faceHeightM
              ),
            },
            { name: 'grid', positions: normalizedParBoxGridEmitterPositions(n) },
          ]
        : []

    if (candidates.length === 0) {
      const nextEmitters = autoResizeEmittersToFitFace(
        emitters,
        current,
        dims.faceWidthM,
        dims.faceHeightM
      )
      updateModelEmitters(bundleEmittersToSubfixtureChannels(nextEmitters))
      return
    }

    let best = candidates[0]!
    let bestScore = layoutScore(current, best.positions)
    for (let i = 1; i < candidates.length; i++) {
      const cand = candidates[i]!
      const s = layoutScore(current, cand.positions)
      if (s < bestScore) {
        bestScore = s
        best = cand
      }
    }

    const layoutKind = best.name as EmitterAutoLayoutKind
    const targetPerEmitter = assignEmitterLayoutPositionsInOrder(
      emitters,
      best.positions,
      layoutKind
    )
    const nextEmitters =
      layoutKind === 'line' &&
      emitters.every((emitter) => emitter.shape === 'disc')
        ? fitUniformHorizontalLineDiscLayoutToFace(
            emitters.map((emitter, index) => ({
              ...emitter,
              x: targetPerEmitter[index]?.x ?? emitter.x,
              y: targetPerEmitter[index]?.y ?? emitter.y,
            })),
            dims.faceWidthM,
            dims.faceHeightM
          )
        : autoResizeEmittersToFitFace(
            emitters,
            targetPerEmitter,
            dims.faceWidthM,
            dims.faceHeightM
          )
    updateModelEmitters(bundleEmittersToSubfixtureChannels(nextEmitters))
  }

  function resetEmitterLayout() {
    if (!model.useCustomEmitterLayout) return
    if (model.customEmitters.length > 0) {
      smartAutoGenerateFromNearestLayout()
      return
    }
    hardResetEmitterLayoutFromDefaults()
  }

  function applyParLayoutRing() {
    if (!model.useCustomEmitterLayout || model.customEmitters.length === 0) return
    updateModelEmitters(
      bundleEmittersToSubfixtureChannels(
        layoutEmittersParRing(
          model.customEmitters,
          editorFaceM.faceWidthM,
          editorFaceM.faceHeightM
        )
      )
    )
  }

  function applyParLayoutHoneycomb() {
    if (!model.useCustomEmitterLayout || model.customEmitters.length === 0) return
    updateModelEmitters(
      bundleEmittersToSubfixtureChannels(
        layoutEmittersParHoneycomb(
          model.customEmitters,
          editorFaceM.faceWidthM,
          editorFaceM.faceHeightM
        )
      )
    )
  }

  function applyParLayoutBoxLine() {
    if (!model.useCustomEmitterLayout || model.customEmitters.length === 0) return
    updateModelEmitters(
      bundleEmittersToSubfixtureChannels(
        layoutEmittersParBoxLine(
          model.customEmitters,
          editorFaceM.faceWidthM,
          editorFaceM.faceHeightM
        )
      )
    )
  }

  function applyParLayoutBoxGrid() {
    if (!model.useCustomEmitterLayout || model.customEmitters.length === 0) return
    updateModelEmitters(
      bundleEmittersToSubfixtureChannels(
        layoutEmittersParBoxGrid(
          model.customEmitters,
          editorFaceM.faceWidthM,
          editorFaceM.faceHeightM
        )
      )
    )
  }

  function toggleEmitterChannel(channelIndex: number) {
    if (!model.useCustomEmitterLayout) return
    if (channelEditIds.size === 0) return
    const subIndex =
      subFixtureState.kind === 'assigned' ? subFixtureState.subIndex : null
    if (fixtureType.subFixtures.length > 0 && subIndex === null) {
      return
    }
    if (channelSelection.showAsSingle && !channelSelection.isGroup && selectedEmitter !== null) {
      const hasChannel = selectedEmitter.channelIndexes.includes(channelIndex)
      const channelIndexes = hasChannel
        ? selectedEmitter.channelIndexes.filter((index) => index !== channelIndex)
        : [...selectedEmitter.channelIndexes, channelIndex].sort((a, b) => a - b)
      updateEmitter(selectedEmitter.id, (current) => ({
        ...current,
        channelIndexes,
      }))
      return
    }
    updateChannelEditEmitters((emitters) =>
      toggleChannelForSelected(
        fixtureType,
        emitters,
        channelEditIds,
        channelIndex,
        subIndex
      )
    )
  }

  function assignSubFixture(subIndex: number) {
    if (!model.useCustomEmitterLayout || channelEditIds.size === 0) return
    updateChannelEditEmitters((emitters) =>
      assignSubFixtureToSelected(fixtureType, emitters, channelEditIds, subIndex)
    )
  }

  function clearSelectedChannels() {
    if (!model.useCustomEmitterLayout || channelEditIds.size === 0) return
    updateChannelEditEmitters((emitters) =>
      clearChannelsForSelected(emitters, channelEditIds)
    )
  }

  function groupSelectedEmitters() {
    if (!model.useCustomEmitterLayout || selectedIdSet.size < 2) return
    updateSelectedEmitters((emitters) =>
      applyGroupSelected(emitters, selectedIdSet, nanoid())
    )
  }

  function ungroupSelectedEmitters() {
    if (!model.useCustomEmitterLayout || selectedIdSet.size === 0) return
    updateSelectedEmitters((emitters) => applyUngroupSelected(emitters, selectedIdSet))
  }

  function autoSizeSelectedEmitters() {
    if (!model.useCustomEmitterLayout || selectedIdSet.size === 0) return
    updateSelectedEmitters((emitters) =>
      applyAutoSizeSelectedAtPositions(
        emitters,
        selectedIdSet,
        editorFaceM.faceWidthM,
        editorFaceM.faceHeightM
      )
    )
  }

  function autoAssignSelectedChannels() {
    if (!model.useCustomEmitterLayout || selectedIdSet.size === 0) return
    updateModelEmitters(
      applyAutoAssignChannelsSequential(
        fixtureType,
        model,
        model.customEmitters,
        selectedIdSet,
        selectionOrderRef.current
      )
    )
  }

  function beginEmitterDrag(emitterId: string, event: React.MouseEvent) {
    if (!model.useCustomEmitterLayout) return
    let targets: string[]
    if (!selectedIdSet.has(emitterId)) {
      applyPointerSelection(emitterId, false)
      targets = [emitterId]
    } else {
      targets = [...selectedIdSet]
      const emitter = model.customEmitters.find((e) => e.id === emitterId)
      if (emitter?.groupId) {
        const groupPeers = model.customEmitters
          .filter((e) => e.groupId === emitter.groupId)
          .map((e) => e.id)
        targets = [...new Set([...targets, ...groupPeers])]
      }
    }
    dragTargetsRef.current = targets
    const snapshot = new Map<string, { x: number; y: number }>()
    for (const id of targets) {
      const em = model.customEmitters.find((e) => e.id === id)
      if (em !== undefined) {
        snapshot.set(id, { x: em.x, y: em.y })
      }
    }
    dragSnapshotRef.current = snapshot
    dragDidMoveRef.current = false
    dragPointerStartRef.current = { x: event.clientX, y: event.clientY }
    setDraggingEmitterId(emitterId)
  }

  useEffect(() => {
    if (!model.useCustomEmitterLayout) {
      setDraggingEmitterId(null)
      return
    }
    if (draggingEmitterId === null) {
      return
    }

    const handleMouseMove = (event: MouseEvent) => {
      const face = clientToFaceNormalized(event.clientX, event.clientY)
      if (face === null) {
        return
      }
      const startPtr = dragPointerStartRef.current
      if (
        startPtr !== null &&
        !dragDidMoveRef.current &&
        Math.hypot(event.clientX - startPtr.x, event.clientY - startPtr.y) >=
          DRAG_MOVE_THRESHOLD_PX
      ) {
        dragDidMoveRef.current = true
      }
      if (!dragDidMoveRef.current) {
        return
      }
      const primaryId = draggingEmitterId
      const primaryStart = dragSnapshotRef.current.get(primaryId)
      if (primaryStart === undefined) {
        return
      }
      const { bodyShape, emitters } = snapRef.current
      const dragTargets = dragTargetsRef.current
      const staticEmitters = emitters.filter((e) => !dragTargets.includes(e.id))
      const { x, y } = snapEmitterXY(
        face.x,
        face.y,
        bodyShape,
        primaryId,
        staticEmitters,
        event.shiftKey
      )
      const dx = x - primaryStart.x
      const dy = y - primaryStart.y
      onChange({
        ...model,
        useCustomEmitterLayout: model.useCustomEmitterLayout,
        customEmitters: emitters.map((emitter) => {
          const snap = dragSnapshotRef.current.get(emitter.id)
          if (snap === undefined) {
            return emitter
          }
          return {
            ...emitter,
            x: clamp01(snap.x + dx),
            y: clamp01(snap.y + dy),
          }
        }),
      })
    }

    const handleMouseUp = () => {
      dragDidMoveRef.current = false
      dragPointerStartRef.current = null
      dragTargetsRef.current = []
      dragSnapshotRef.current = new Map()
      setDraggingEmitterId(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [
    clientToFaceNormalized,
    draggingEmitterId,
    model,
    onChange,
    model.useCustomEmitterLayout,
  ])

  useEffect(() => {
    if (!model.useCustomEmitterLayout || marquee === null) {
      return
    }

    const handleMouseMove = (event: MouseEvent) => {
      const face = clientToFaceNormalized(event.clientX, event.clientY)
      if (face === null) {
        return
      }
      setMarquee((current) =>
        current === null ? null : { ...current, x1: face.x, y1: face.y }
      )
    }

    const handleMouseUp = () => {
      setMarquee((current) => {
        if (current === null) {
          return null
        }
        const hits = model.customEmitters
          .filter((emitter) => emitterCenterInNormalizedRect(emitter, current))
          .map((emitter) => emitter.id)
        if (hits.length > 0) {
          if (marqueeAdditiveRef.current) {
            const merged = [
              ...new Set([...selectionOrderRef.current, ...hits]),
            ]
            commitSelection(merged, merged)
          } else {
            commitSelection(hits, hits)
          }
        } else if (!marqueeAdditiveRef.current) {
          commitSelection([], [])
        }
        return null
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [
    clientToFaceNormalized,
    commitSelection,
    marquee,
    model.customEmitters,
    model.useCustomEmitterLayout,
  ])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!model.useCustomEmitterLayout || selectedIdSet.size === 0) {
        return
      }
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }
      const step = event.shiftKey ? NUDGE_STEP_SHIFT : NUDGE_STEP
      let dx = 0
      let dy = 0
      if (event.key === 'ArrowLeft') {
        dx = -step
      } else if (event.key === 'ArrowRight') {
        dx = step
      } else if (event.key === 'ArrowUp') {
        dy = -step
      } else if (event.key === 'ArrowDown') {
        dy = step
      } else {
        return
      }
      event.preventDefault()
      updateSelectedEmitters((emitters) =>
        nudgeSelectedEmitters(emitters, selectedIdSet, dx, dy)
      )
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [model.useCustomEmitterLayout, selectedIdSet])

  const ribbonDisabled = !model.useCustomEmitterLayout
  const hasSelection = selectionCount > 0

  return (
    <Root $inModal={inModal}>
      <TitleRow>
        <SectionTitle>Emitter Layout Editor</SectionTitle>
        <EmitterLayoutHelpButton isPar={isPar} />
      </TitleRow>
      <BodyDims>
        <DimsLabel>Emitter face (layout scale):</DimsLabel>
        <DimsValue>
          {model.bodyShape === 'cylinder'
            ? `Diameter ${faceWidthDisplay.toFixed(2)} ${widthUnitLabel} · Height ${bodyHeightDisplay.toFixed(2)} ${widthUnitLabel}`
            : `Width ${faceWidthDisplay.toFixed(2)} ${widthUnitLabel} · Height ${faceHeightDisplay.toFixed(2)} ${widthUnitLabel}`}
          {effectiveKind === 'washBar' && model.bodyShape === 'box'
            ? ` · Bar width ${bodyWidthDisplay.toFixed(2)} ${widthUnitLabel}`
            : !isPar && model.bodyShape === 'box'
              ? ` · Body width ${bodyWidthDisplay.toFixed(2)} ${widthUnitLabel}`
              : ''}
          {model.bodyShape !== 'cylinder' || isPar
            ? ` · Depth ${bodyDepthDisplay.toFixed(2)} ${widthUnitLabel}`
            : ''}
        </DimsValue>
      </BodyDims>
      {!model.useCustomEmitterLayout && (
        <DisabledNote>
          Custom layout is disabled. Enable it above to edit emitter placement.
        </DisabledNote>
      )}
      <EditorRow $inModal={inModal}>
        <CanvasColumn $inModal={inModal}>
          <ToolRibbon>
            <Tooltip title="Select tool — box-select and Shift+click multi-select">
              <span>
                <RibbonIconButton
                  $active={editorTool === 'select'}
                  disabled={ribbonDisabled}
                  onClick={() => setEditorTool('select')}
                  aria-label="Select tool"
                >
                  <NearMeIcon fontSize="small" />
                </RibbonIconButton>
              </span>
            </Tooltip>
            <Tooltip title="Move tool — drag emitters to reposition">
              <span>
                <RibbonIconButton
                  $active={editorTool === 'move'}
                  disabled={ribbonDisabled}
                  onClick={() => setEditorTool('move')}
                  aria-label="Move tool"
                >
                  <OpenWithIcon fontSize="small" />
                </RibbonIconButton>
              </span>
            </Tooltip>
            <RibbonDivider />
            <Tooltip title="Add emitter">
              <span>
                <RibbonIconButton disabled={ribbonDisabled} onClick={addEmitter} aria-label="Add emitter">
                  <AddIcon fontSize="small" />
                </RibbonIconButton>
              </span>
            </Tooltip>
            <Tooltip title="Remove selected emitter(s)">
              <span>
                <RibbonIconButton
                  disabled={ribbonDisabled || !hasSelection}
                  onClick={removeSelectedEmitters}
                  aria-label="Remove selected"
                >
                  <RemoveIcon fontSize="small" />
                </RibbonIconButton>
              </span>
            </Tooltip>
            <Tooltip title="Auto-generate layout from nearest pattern and fit sizes">
              <span>
                <RibbonIconButton disabled={ribbonDisabled} onClick={resetEmitterLayout} aria-label="Auto-generate">
                  <AutoFixHighIcon fontSize="small" />
                </RibbonIconButton>
              </span>
            </Tooltip>
            <Tooltip title="Group selected emitters">
              <span>
                <RibbonIconButton
                  disabled={ribbonDisabled || selectionCount < 2}
                  onClick={groupSelectedEmitters}
                  aria-label="Group"
                >
                  <GroupWorkIcon fontSize="small" />
                </RibbonIconButton>
              </span>
            </Tooltip>
            <Tooltip title="Ungroup selected emitters">
              <span>
                <RibbonIconButton
                  disabled={ribbonDisabled || !hasSelection}
                  onClick={ungroupSelectedEmitters}
                  aria-label="Ungroup"
                >
                  <GroupOffIcon fontSize="small" />
                </RibbonIconButton>
              </span>
            </Tooltip>
            <Tooltip title="Auto-size selected — largest size at current positions">
              <span>
                <RibbonIconButton
                  disabled={ribbonDisabled || !hasSelection}
                  onClick={autoSizeSelectedEmitters}
                  aria-label="Auto-size selected"
                >
                  <FitScreenIcon fontSize="small" />
                </RibbonIconButton>
              </span>
            </Tooltip>
            <Tooltip title="Auto-assign subfixture channel groups to selected emitters in order">
              <span>
                <RibbonIconButton
                  disabled={ribbonDisabled || !hasSelection || fixtureType.subFixtures.length === 0}
                  onClick={autoAssignSelectedChannels}
                  aria-label="Auto-assign channels"
                >
                  <PlaylistAddIcon fontSize="small" />
                </RibbonIconButton>
              </span>
            </Tooltip>
            <RibbonDivider />
            <Tooltip title="Match size to first selected (or top-left)">
              <span>
                <RibbonIconButton
                  disabled={ribbonDisabled || selectionCount < 2}
                  onClick={() =>
                    updateSelectedEmitters((emitters) =>
                      applyMatchSizeToReference(
                        emitters,
                        selectedIdSet,
                        selectionOrderRef.current
                      )
                    )
                  }
                  aria-label="Match size"
                >
                  <PhotoSizeSelectSmallIcon fontSize="small" />
                </RibbonIconButton>
              </span>
            </Tooltip>
            <Tooltip title="Match shape to first selected (or top-left)">
              <span>
                <RibbonIconButton
                  disabled={ribbonDisabled || selectionCount < 2}
                  onClick={() =>
                    updateSelectedEmitters((emitters) =>
                      applyMatchShapeToReference(
                        emitters,
                        selectedIdSet,
                        selectionOrderRef.current
                      )
                    )
                  }
                  aria-label="Match shape"
                >
                  <CropSquareIcon fontSize="small" />
                </RibbonIconButton>
              </span>
            </Tooltip>
            <Tooltip title="Align vertical centers to reference emitter">
              <span>
                <RibbonIconButton
                  disabled={ribbonDisabled || selectionCount < 2}
                  onClick={() =>
                    updateSelectedEmitters((emitters) =>
                      applyAlignVerticalCenterToReference(
                        emitters,
                        selectedIdSet,
                        selectionOrderRef.current
                      )
                    )
                  }
                  aria-label="Align vertical center"
                >
                  <VerticalAlignCenterIcon fontSize="small" />
                </RibbonIconButton>
              </span>
            </Tooltip>
            <Tooltip title="Align horizontal centers to reference emitter">
              <span>
                <RibbonIconButton
                  disabled={ribbonDisabled || selectionCount < 2}
                  onClick={() =>
                    updateSelectedEmitters((emitters) =>
                      applyAlignHorizontalCenterToReference(
                        emitters,
                        selectedIdSet,
                        selectionOrderRef.current
                      )
                    )
                  }
                  aria-label="Align horizontal center"
                >
                  <AlignHorizontalCenterIcon fontSize="small" />
                </RibbonIconButton>
              </span>
            </Tooltip>
            <Tooltip title="Distribute horizontally between first and last selected">
              <span>
                <RibbonIconButton
                  disabled={ribbonDisabled || selectionCount < 3}
                  onClick={() =>
                    updateSelectedEmitters((emitters) =>
                      applyDistributeHorizontalBetweenEndpoints(
                        emitters,
                        selectedIdSet,
                        selectionOrderRef.current
                      )
                    )
                  }
                  aria-label="Distribute horizontally"
                >
                  <CompareArrowsIcon fontSize="small" />
                </RibbonIconButton>
              </span>
            </Tooltip>
            <Tooltip title="Distribute vertically between first and last selected">
              <span>
                <RibbonIconButton
                  disabled={ribbonDisabled || selectionCount < 3}
                  onClick={() =>
                    updateSelectedEmitters((emitters) =>
                      applyDistributeVerticalBetweenEndpoints(
                        emitters,
                        selectedIdSet,
                        selectionOrderRef.current
                      )
                    )
                  }
                  aria-label="Distribute vertically"
                >
                  <UnfoldMoreIcon fontSize="small" />
                </RibbonIconButton>
              </span>
            </Tooltip>
            {showParLayoutTools && isParCylinder && (
              <>
                <RibbonDivider />
                <Tooltip title="PAR ring layout">
                  <span>
                    <RibbonIconButton disabled={ribbonDisabled} onClick={applyParLayoutRing} aria-label="PAR ring">
                      R
                    </RibbonIconButton>
                  </span>
                </Tooltip>
                <Tooltip title="PAR honeycomb layout">
                  <span>
                    <RibbonIconButton disabled={ribbonDisabled} onClick={applyParLayoutHoneycomb} aria-label="PAR honeycomb">
                      H
                    </RibbonIconButton>
                  </span>
                </Tooltip>
              </>
            )}
            {showParLayoutTools && isParBox && (
              <>
                <RibbonDivider />
                <Tooltip title="PAR single row">
                  <span>
                    <RibbonIconButton disabled={ribbonDisabled} onClick={applyParLayoutBoxLine} aria-label="PAR row">
                      —
                    </RibbonIconButton>
                  </span>
                </Tooltip>
                <Tooltip title="PAR grid">
                  <span>
                    <RibbonIconButton disabled={ribbonDisabled} onClick={applyParLayoutBoxGrid} aria-label="PAR grid">
                      #
                    </RibbonIconButton>
                  </span>
                </Tooltip>
              </>
            )}
          </ToolRibbon>
          <ZoomBar>
            <Tooltip title="Zoom out">
              <span>
                <RibbonIconButton
                  disabled={ribbonDisabled || canvasZoom <= CANVAS_ZOOM_MIN}
                  onClick={() => adjustCanvasZoom(-CANVAS_ZOOM_STEP)}
                  aria-label="Zoom out"
                >
                  <ZoomOutIcon fontSize="small" />
                </RibbonIconButton>
              </span>
            </Tooltip>
            <ZoomLabel>{Math.round(canvasZoom * 100)}%</ZoomLabel>
            <Tooltip title="Zoom in">
              <span>
                <RibbonIconButton
                  disabled={ribbonDisabled || canvasZoom >= CANVAS_ZOOM_MAX}
                  onClick={() => adjustCanvasZoom(CANVAS_ZOOM_STEP)}
                  aria-label="Zoom in"
                >
                  <ZoomInIcon fontSize="small" />
                </RibbonIconButton>
              </span>
            </Tooltip>
            <Tooltip title="Fit work area to view (100%)">
              <span>
                <RibbonIconButton
                  disabled={ribbonDisabled}
                  onClick={resetCanvasZoom}
                  aria-label="Fit to view"
                >
                  <FitScreenIcon fontSize="small" />
                </RibbonIconButton>
              </span>
            </Tooltip>
            <ZoomHint>Ctrl+wheel to zoom</ZoomHint>
          </ZoomBar>
          <CanvasViewport
            ref={canvasViewportRef}
            $inModal={inModal}
            onWheel={onCanvasViewportWheel}
          >
            <EditorPane
              ref={editorRef}
              $inModal={inModal}
              $sized={canvasPaneSize !== null}
              $disabled={!model.useCustomEmitterLayout}
              $aspect={bodyBounds.aspect}
              style={
                canvasPaneSize !== null
                  ? {
                      width: canvasPaneSize.width,
                      height: canvasPaneSize.height,
                    }
                  : undefined
              }
              onMouseDown={(event) => {
                if (!model.useCustomEmitterLayout || editorTool !== 'select') {
                  return
                }
                if (event.target !== event.currentTarget) {
                  return
                }
                const face = clientToFaceNormalized(event.clientX, event.clientY)
                if (face === null) {
                  return
                }
                event.preventDefault()
                marqueeAdditiveRef.current = event.shiftKey
                if (!event.shiftKey) {
                  commitSelection([], [])
                }
                setMarquee({ x0: face.x, y0: face.y, x1: face.x, y1: face.y })
              }}
            >
            <BodyFaceClip
              style={{
                left: `${bodyBounds.left}%`,
                top: `${bodyBounds.top}%`,
                width: `${bodyBounds.width}%`,
                aspectRatio: bodyBounds.aspect,
              }}
              onMouseDown={(event) => {
                if (!model.useCustomEmitterLayout || editorTool !== 'select') {
                  return
                }
                if ((event.target as HTMLElement).closest('button')) {
                  return
                }
                const face = clientToFaceNormalized(event.clientX, event.clientY)
                if (face === null) {
                  return
                }
                event.preventDefault()
                event.stopPropagation()
                marqueeAdditiveRef.current = event.shiftKey
                if (!event.shiftKey) {
                  commitSelection([], [])
                }
                setMarquee({ x0: face.x, y0: face.y, x1: face.x, y1: face.y })
              }}
            >
              {model.bodyShape === 'cylinder' ? (
                <BodyCircle />
              ) : (
                <BodyRect />
              )}
              {marquee !== null && (
                <MarqueeRect
                  style={{
                    left: `${Math.min(marquee.x0, marquee.x1) * 100}%`,
                    top: `${Math.min(marquee.y0, marquee.y1) * 100}%`,
                    width: `${Math.abs(marquee.x1 - marquee.x0) * 100}%`,
                    height: `${Math.abs(marquee.y1 - marquee.y0) * 100}%`,
                  }}
                />
              )}
              {model.customEmitters.map((emitter, emitterIndex) => {
                const selected = selectedIdSet.has(emitter.id)
                const vis = emitterVisualSizeBodyRelative(
                  emitter,
                  editorFaceM.faceWidthM,
                  editorFaceM.faceHeightM
                )
                return (
                  <EmitterDot
                    key={emitter.id}
                    $x={emitter.x * 100}
                    $y={emitter.y * 100}
                    $shape={emitter.shape}
                    $wPct={vis.wPct}
                    $hPct={vis.hPct}
                    $discCircle={vis.discCircle}
                    $selected={selected}
                    $grouped={Boolean(emitter.groupId)}
                    title={`Emitter ${emitterIndex + 1}`}
                    onMouseDown={(event) => {
                      if (!model.useCustomEmitterLayout) return
                      event.preventDefault()
                      event.stopPropagation()
                      if (editorTool === 'select') {
                        applyPointerSelection(emitter.id, event.shiftKey)
                        return
                      }
                      if (event.shiftKey) {
                        applyPointerSelection(emitter.id, true)
                      } else if (!selectedIdSet.has(emitter.id)) {
                        applyPointerSelection(emitter.id, false)
                      }
                      beginEmitterDrag(emitter.id, event)
                    }}
                  >
                    {emitterIndex + 1}
                  </EmitterDot>
                )
              })}
            </BodyFaceClip>
            </EditorPane>
          </CanvasViewport>
        </CanvasColumn>
        <Sidebar $inModal={inModal}>
          <SidebarScroll $inModal={inModal}>
          {selectionCount === 0 ? (
            <SidebarPlaceholder>
              <SubText>Select an emitter to edit subfixture and channel assignment.</SubText>
            </SidebarPlaceholder>
          ) : channelSelection.isGroup ? (
            <>
              <FieldTitle>{`Grouped emitters (${channelEditIds.size})`}</FieldTitle>
              <SubText>
                Subfixture and channels apply to the whole group. Drag any member to
                move the group; use position fields on a single ungrouped emitter.
              </SubText>
              <EmitterSubfixtureChannelPanel
                fixtureType={fixtureType}
                emitters={model.customEmitters}
                selectedIds={channelEditIds}
                selectionCount={channelEditIds.size}
                multiSelected={false}
                subFixtureState={subFixtureState}
                channelLabel={fixtureChannelLabel}
                onAssignSubFixture={assignSubFixture}
                onToggleChannel={toggleEmitterChannel}
                onClearChannels={clearSelectedChannels}
              />
            </>
          ) : multiSelectedForChannels ? (
            <>
              <FieldTitle>{`${selectionCount} emitters selected`}</FieldTitle>
              <SubText>
                Position, shape, and size apply to one emitter at a time.
              </SubText>
              <EmitterSubfixtureChannelPanel
                fixtureType={fixtureType}
                emitters={model.customEmitters}
                selectedIds={channelEditIds}
                selectionCount={channelEditIds.size}
                multiSelected
                subFixtureState={subFixtureState}
                channelLabel={fixtureChannelLabel}
                onAssignSubFixture={assignSubFixture}
                onToggleChannel={toggleEmitterChannel}
                onClearChannels={clearSelectedChannels}
              />
            </>
          ) : selectedEmitter === null ? (
            <SubText>Select an emitter to edit it.</SubText>
          ) : (
            <>
              <FieldTitle>{`Emitter ${model.customEmitters.findIndex((emitter) => emitter.id === selectedEmitter.id) + 1}`}</FieldTitle>
              <TwoCol>
                <NumberField
                  val={Number(selectedEmitter.x.toFixed(3))}
                  min={0}
                  max={1}
                  numberType="float"
                  step={0.01}
                  label="X"
                  onChange={(x) =>
                    updateEmitter(selectedEmitter.id, (current) => ({
                      ...current,
                      x: clamp01(x),
                    }))
                  }
                />
                <NumberField
                  val={Number(selectedEmitter.y.toFixed(3))}
                  min={0}
                  max={1}
                  numberType="float"
                  step={0.01}
                  label="Y"
                  onChange={(y) =>
                    updateEmitter(selectedEmitter.id, (current) => ({
                      ...current,
                      y: clamp01(y),
                    }))
                  }
                />
              </TwoCol>
              <TwoCol>
                <NumberField
                  val={Number(selectedEmitter.z.toFixed(3))}
                  min={0}
                  max={1}
                  numberType="float"
                  step={0.01}
                  label="Z / Depth"
                  onChange={(z) =>
                    updateEmitter(selectedEmitter.id, (current) => ({
                      ...current,
                      z: clamp01(z),
                    }))
                  }
                />
                {selectedEmitter.shape === 'disc' ? (
                  <NumberField
                    val={
                      stageUnit === 'm'
                        ? Number((selectedEmitter.size * 1000).toFixed(2))
                        : Number((selectedEmitter.size * METERS_PER_INCH).toFixed(3))
                    }
                    min={
                      stageUnit === 'm'
                        ? EMITTER_DIAMETER_MIN_M * 1000
                        : EMITTER_DIAMETER_MIN_M * METERS_PER_INCH
                    }
                    max={
                      stageUnit === 'm'
                        ? EMITTER_DIAMETER_MAX_M * 1000
                        : EMITTER_DIAMETER_MAX_M * METERS_PER_INCH
                    }
                    numberType="float"
                    step={stageUnit === 'm' ? 1 : 0.125}
                    label={stageUnit === 'm' ? 'Diameter (mm)' : 'Diameter (in)'}
                    onChange={(display) => {
                      if (!Number.isFinite(display)) {
                        return
                      }
                      const diameterM =
                        stageUnit === 'm'
                          ? clampEmitterDiameterM(display / 1000)
                          : clampEmitterDiameterM(display / METERS_PER_INCH)
                      updateEmitter(selectedEmitter.id, (current) => ({
                        ...current,
                        size: diameterM,
                      }))
                    }}
                  />
                ) : (
                  <div />
                )}
              </TwoCol>
              {selectedEmitter.shape !== 'disc' && (
                <TwoCol>
                  <NumberField
                    val={
                      stageUnit === 'm'
                        ? Number(
                            (
                              normalizeRectEmitterFaceDimensionsM(selectedEmitter)
                                .widthM * 1000
                            ).toFixed(2)
                          )
                        : Number(
                            (
                              normalizeRectEmitterFaceDimensionsM(selectedEmitter)
                                .widthM * METERS_PER_INCH
                            ).toFixed(3)
                          )
                    }
                    min={
                      stageUnit === 'm'
                        ? EMITTER_DIAMETER_MIN_M * 1000
                        : EMITTER_DIAMETER_MIN_M * METERS_PER_INCH
                    }
                    max={
                      stageUnit === 'm'
                        ? 2000
                        : 2000 / METERS_PER_INCH
                    }
                    numberType="float"
                    step={stageUnit === 'm' ? 1 : 0.125}
                    label={stageUnit === 'm' ? 'Width (mm)' : 'Width (in)'}
                    onChange={(display) => {
                      if (!Number.isFinite(display)) {
                        return
                      }
                      const widthM =
                        stageUnit === 'm'
                          ? clampRectFaceExtentM(display / 1000)
                          : clampRectFaceExtentM(display / METERS_PER_INCH)
                      updateEmitter(selectedEmitter.id, (current) => {
                        const face = normalizeRectEmitterFaceDimensionsM(current)
                        return {
                          ...current,
                          rectWidthM: widthM,
                          rectHeightM:
                            current.rectHeightM !== undefined &&
                            Number.isFinite(current.rectHeightM)
                              ? current.rectHeightM
                              : face.heightM,
                        }
                      })
                    }}
                  />
                  <NumberField
                    val={
                      stageUnit === 'm'
                        ? Number(
                            (
                              normalizeRectEmitterFaceDimensionsM(selectedEmitter)
                                .heightM * 1000
                            ).toFixed(2)
                          )
                        : Number(
                            (
                              normalizeRectEmitterFaceDimensionsM(selectedEmitter)
                                .heightM * METERS_PER_INCH
                            ).toFixed(3)
                          )
                    }
                    min={
                      stageUnit === 'm'
                        ? EMITTER_DIAMETER_MIN_M * 1000
                        : EMITTER_DIAMETER_MIN_M * METERS_PER_INCH
                    }
                    max={
                      stageUnit === 'm'
                        ? 2000
                        : 2000 / METERS_PER_INCH
                    }
                    numberType="float"
                    step={stageUnit === 'm' ? 1 : 0.125}
                    label={stageUnit === 'm' ? 'Height (mm)' : 'Height (in)'}
                    onChange={(display) => {
                      if (!Number.isFinite(display)) {
                        return
                      }
                      const heightM =
                        stageUnit === 'm'
                          ? clampRectFaceExtentM(display / 1000)
                          : clampRectFaceExtentM(display / METERS_PER_INCH)
                      updateEmitter(selectedEmitter.id, (current) => {
                        const face = normalizeRectEmitterFaceDimensionsM(current)
                        return {
                          ...current,
                          rectHeightM: heightM,
                          rectWidthM:
                            current.rectWidthM !== undefined &&
                            Number.isFinite(current.rectWidthM)
                              ? current.rectWidthM
                              : face.widthM,
                        }
                      })
                    }}
                  />
                </TwoCol>
              )}
              <ShapeField>
                <ShapeLabel htmlFor="emitter-shape-select">Emitter shape</ShapeLabel>
                <ShapeSelect
                  id="emitter-shape-select"
                  value={selectedEmitter.shape}
                  onChange={(event) => {
                    const shape = event.target.value as FixtureEmitterShape
                    updateEmitter(selectedEmitter.id, (current) => {
                      if (shape === 'disc') {
                        return {
                          ...current,
                          shape,
                          rectWidthM: undefined,
                          rectHeightM: undefined,
                        }
                      }
                      if (
                        (shape === 'rect-h' && current.shape === 'rect-v') ||
                        (shape === 'rect-v' && current.shape === 'rect-h')
                      ) {
                        const w = current.rectWidthM
                        const h = current.rectHeightM
                        if (
                          w !== undefined &&
                          h !== undefined &&
                          Number.isFinite(w) &&
                          Number.isFinite(h)
                        ) {
                          return {
                            ...current,
                            shape,
                            rectWidthM: h,
                            rectHeightM: w,
                          }
                        }
                      }
                      const next = { ...current, shape }
                      const face = normalizeRectEmitterFaceDimensionsM(next)
                      return {
                        ...next,
                        rectWidthM: face.widthM,
                        rectHeightM: face.heightM,
                      }
                    })
                  }}
                >
                  <option value="disc">{shapeLabel('disc')}</option>
                  <option value="rect-h">{shapeLabel('rect-h')}</option>
                  <option value="rect-v">{shapeLabel('rect-v')}</option>
                </ShapeSelect>
              </ShapeField>
              <EmitterSubfixtureChannelPanel
                fixtureType={fixtureType}
                emitters={model.customEmitters}
                selectedIds={channelEditIds}
                selectionCount={channelEditIds.size}
                multiSelected={false}
                subFixtureState={subFixtureState}
                channelLabel={fixtureChannelLabel}
                onAssignSubFixture={assignSubFixture}
                onToggleChannel={toggleEmitterChannel}
                onClearChannels={clearSelectedChannels}
              />
            </>
          )}
          </SidebarScroll>
        </Sidebar>
      </EditorRow>
    </Root>
  )
}

const Root = styled.div<{ $inModal: boolean }>`
  margin-top: ${(props) => (props.$inModal ? '0' : '0.35rem')};
  border: 1px solid
    ${(props) => (props.$inModal ? '#4f7ec455' : props.theme.colors.divider)};
  border-radius: 0.35rem;
  padding: 0.55rem 0.65rem 0.65rem;
  background: ${(props) =>
    props.$inModal
      ? 'linear-gradient(165deg, #1a2438 0%, #121820 55%)'
      : props.theme.colors.bg.primary};
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  ${(props) =>
    props.$inModal
      ? `
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `
      : ''}
`

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 0.2rem;
  flex-shrink: 0;
`

const SectionTitle = styled.div`
  font-size: 0.9rem;
  font-weight: 700;
  flex: 1;
  color: #d8e8ff;
`

const SubText = styled.div`
  font-size: 0.76rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const BodyDims = styled.div`
  margin-top: 0.4rem;
  margin-bottom: 0.4rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.76rem;
  flex-shrink: 0;
`

const DimsLabel = styled.div`
  font-weight: 700;
  color: ${(props) => props.theme.colors.text.primary};
`

const DimsValue = styled.div`
  color: ${(props) => props.theme.colors.text.secondary};
`

const CanvasColumn = styled.div<{ $inModal: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
  ${(props) =>
    props.$inModal
      ? `
    flex: 1 1 auto;
    min-height: 0;
  `
      : 'flex-shrink: 0;'}
`

const ToolRibbon = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.15rem;
  padding: 0.28rem 0.35rem;
  border: 1px solid #4a6ea866;
  border-radius: 0.28rem;
  background: linear-gradient(180deg, #243552 0%, #1a283c 100%);
  flex-shrink: 0;
`

const ZoomBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.2rem;
  padding: 0.2rem 0.35rem;
  border: 1px solid #3d5f8f66;
  border-radius: 0.28rem;
  background: #152030;
  flex-shrink: 0;
`

const ZoomLabel = styled.span`
  min-width: 2.75rem;
  text-align: center;
  font-size: 0.72rem;
  font-weight: 700;
  color: #b8d4ff;
`

const ZoomHint = styled.span`
  margin-left: auto;
  font-size: 0.66rem;
  color: #7fa3d4;
`

const CanvasViewport = styled.div<{ $inModal: boolean }>`
  position: relative;
  overflow: auto;
  border: 1px solid #4a6ea888;
  border-radius: 0.3rem;
  background:
    radial-gradient(circle at 12% 8%, #2a4a7a33 0%, transparent 42%),
    #0e141e;
  box-sizing: border-box;
  ${(props) =>
    props.$inModal
      ? `
    flex: 1 1 auto;
    min-height: 0;
  `
      : `
    min-height: 14rem;
    max-height: min(52vh, 34rem);
  `}
`

const RibbonDivider = styled(Divider)`
  && {
    margin: 0 0.15rem;
    height: 1.35rem;
    align-self: center;
  }
`

const RibbonIconButton = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.85rem;
  height: 1.85rem;
  padding: 0;
  border: 1px solid
    ${(props) =>
      props.$active ? '#4c8bff' : props.theme.colors.divider};
  border-radius: 0.25rem;
  background: ${(props) =>
    props.$active ? '#1d3f77' : props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
  cursor: pointer;
  font-size: 0.72rem;
  font-weight: 700;
  :disabled {
    cursor: default;
    opacity: 0.4;
  }
  :not(:disabled):hover {
    border-color: #6fb0ff;
  }
`

const EditorRow = styled.div<{ $inModal: boolean }>`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.85rem;
  align-items: start;
  min-width: 0;
  ${(props) =>
    props.$inModal
      ? `
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    align-items: stretch;
  `
      : ''}

  @media (min-width: 960px) {
    grid-template-columns: minmax(0, 1.65fr) minmax(0, 1fr);
  }
`

const EditorPane = styled.div<{
  $disabled: boolean
  $aspect: number
  $inModal: boolean
  $sized: boolean
}>`
  position: relative;
  isolation: isolate;
  z-index: ${canvasLayerZIndex.grid};
  flex-shrink: 0;
  border: 1px dashed #6a9ee088;
  border-radius: 0.3rem;
  background:
    linear-gradient(transparent 94%, #7eb8ff28 94%),
    linear-gradient(90deg, transparent 94%, #7eb8ff28 94%),
    #182433;
  background-size: 1rem 1rem;
  overflow: visible;
  opacity: ${(props) => (props.$disabled ? 0.65 : 1)};
  pointer-events: ${(props) => (props.$disabled ? 'none' : 'auto')};
  ${(props) =>
    props.$sized
      ? ''
      : `
    width: 100%;
    aspect-ratio: ${props.$aspect};
    min-height: 12rem;
  `}
`

const DisabledNote = styled.div`
  margin-bottom: 0.45rem;
  font-size: 0.76rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const BodyFaceClip = styled.div`
  position: absolute;
  z-index: ${canvasLayerZIndex.grid};
  overflow: visible;
`

const MarqueeRect = styled.div`
  position: absolute;
  z-index: ${canvasLayerZIndex.marquee};
  border: 1px dashed #6fb0ff;
  background: rgba(47, 126, 244, 0.15);
  pointer-events: none;
  box-sizing: border-box;
`

const BodyRect = styled.div`
  position: absolute;
  inset: 0;
  z-index: ${canvasLayerZIndex.grid};
  border: 1px solid #8eb8ff66;
  border-radius: 0.25rem;
  background: linear-gradient(145deg, #2a3d55 0%, #1e2c40 100%);
  box-shadow: inset 0 0 0 1px #0006;
  pointer-events: none;
`

const BodyCircle = styled.div`
  position: absolute;
  inset: 0;
  z-index: ${canvasLayerZIndex.grid};
  border: 1px solid #8eb8ff66;
  border-radius: 999rem;
  background: radial-gradient(circle at 35% 28%, #3a5270 0%, #1e2c40 72%);
  box-shadow: inset 0 0 0 1px #0006;
  pointer-events: none;
`

const EmitterDot = styled.button<{
  $x: number
  $y: number
  $shape: FixtureEmitterShape
  $wPct: number
  $hPct: number
  $discCircle: boolean
  $selected: boolean
  $grouped: boolean
}>`
  position: absolute;
  left: ${(props) => props.$x}%;
  top: ${(props) => props.$y}%;
  transform: translate(-50%, -50%);
  ${(props) =>
    props.$discCircle
      ? `
    width: ${props.$wPct}%;
    height: auto;
    aspect-ratio: 1;
    min-height: 0;
  `
      : `
    width: ${props.$wPct}%;
    height: ${props.$hPct}%;
  `}
  min-width: ${(props) => (props.$discCircle ? '0' : '0.35rem')};
  min-height: ${(props) => (props.$discCircle ? '0' : '0.35rem')};
  max-width: 100%;
  max-height: ${(props) => (props.$discCircle ? 'none' : '100%')};
  border-radius: ${(props) => (props.$shape === 'disc' ? '999rem' : '0.2rem')};
  border: 1px solid
    ${(props) =>
      props.$selected ? '#9fd0ff' : props.$grouped ? '#f0c85a' : '#9eb4cc'};
  background: ${(props) =>
    props.$selected
      ? 'linear-gradient(180deg, #4a9bff 0%, #2568d4 100%)'
      : props.$grouped
        ? 'linear-gradient(180deg, #6a5830 0%, #4a3e22 100%)'
        : 'linear-gradient(180deg, #4a5a6e 0%, #2e3848 100%)'};
  color: #f2f6ff;
  box-shadow: ${(props) =>
    props.$selected ? '0 0 0.35rem #4a9bff88' : '0 0.1rem 0.2rem #0006'};
  font-size: 0.58rem;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  z-index: ${canvasLayerZIndex.marker};
  box-sizing: border-box;
`

const Sidebar = styled.div<{ $inModal: boolean }>`
  border: 1px solid #4a6ea866;
  border-radius: 0.28rem;
  padding: 0.45rem;
  display: flex;
  flex-direction: column;
  align-self: stretch;
  min-width: 0;
  max-width: 100%;
  background: linear-gradient(180deg, #1c2838 0%, #141c28 100%);
  ${(props) =>
    props.$inModal
      ? `
    min-height: 0;
    max-height: 100%;
    overflow: hidden;
  `
      : ''}
`

const SidebarScroll = styled.div<{ $inModal: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  ${(props) =>
    props.$inModal
      ? `
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding-right: 0.15rem;
  `
      : ''}
`

const SidebarPlaceholder = styled.div`
  flex: 1 1 auto;
  min-height: 12rem;
  display: flex;
  align-items: flex-start;
`

const FieldTitle = styled.div`
  font-size: 0.8rem;
  font-weight: 700;
  color: #d4e6ff;
`

const ShapeField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
`

const ShapeLabel = styled.label`
  font-size: 0.72rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const ShapeSelect = styled.select`
  width: 100%;
  min-width: 0;
  border: 1px solid #4a6ea888;
  border-radius: 0.25rem;
  background: #121a26;
  color: #e8f2ff;
  font-size: 0.8rem;
  padding: 0.28rem 0.35rem;
  cursor: pointer;
`

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;
`

