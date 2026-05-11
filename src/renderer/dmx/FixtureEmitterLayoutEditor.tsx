import { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import NumberField from '../base/NumberField'
import { useDmxSelector } from '../redux/store'
import {
  FixtureChannel,
  FixtureEmitterDefinition,
  FixtureEmitterShape,
  FixtureModelConfig,
  FixtureType,
  autoResizeEmittersToFitFace,
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

interface Props {
  fixtureType: FixtureType
  model: FixtureModelConfig
  onChange: (nextModel: FixtureModelConfig) => void
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.5
  return Math.max(0, Math.min(1, value))
}

const EDITOR_SAFE_PADDING_PERCENT = 12

type BodyBounds = {
  left: number
  top: number
  width: number
  height: number
  aspect: number
}

function computeBodyBounds(model: FixtureModelConfig): BodyBounds {
  const dims = fixtureFrontFaceDimensionsM(model)
  const faceWidth = Math.max(0.05, dims.faceWidthM)
  const faceHeight = Math.max(0.05, dims.faceHeightM)
  const aspect = Math.max(0.2, Math.min(8, faceWidth / faceHeight))

  const maxWidth = 100 - EDITOR_SAFE_PADDING_PERCENT * 2
  const maxHeight = 100 - EDITOR_SAFE_PADDING_PERCENT * 2
  let width = maxWidth
  let height = width / aspect
  if (height > maxHeight) {
    height = maxHeight
    width = height * aspect
  }
  return {
    left: (100 - width) * 0.5,
    top: (100 - height) * 0.5,
    width,
    height,
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

/**
 * Emitter size as % of the editor pane so the WYSIWYG matches physical size vs. face
 * (avoids rem + arbitrary caps that made large emitters tiny or mis-scaled).
 */
function emitterVisualSizePercent(
  emitter: Pick<
    FixtureEmitterDefinition,
    'shape' | 'size' | 'rectWidthM' | 'rectHeightM'
  >,
  faceWidthM: number,
  faceHeightM: number,
  bounds: BodyBounds
): { wPct: number; hPct: number } {
  const fw = Math.max(0.001, faceWidthM)
  const fh = Math.max(0.001, faceHeightM)

  if (emitter.shape === 'disc') {
    const d = clampEmitterDiameterM(emitter.size)
    const wPct = (d / fw) * bounds.width
    const hPct = (d / fh) * bounds.height
    return {
      wPct: clamp(wPct, 1.1, bounds.width * 0.98),
      hPct: clamp(hPct, 1.1, bounds.height * 0.98),
    }
  }

  const { widthM, heightM } = normalizeRectEmitterFaceDimensionsM(emitter)
  const wPct = (widthM / fw) * bounds.width
  const hPct = (heightM / fh) * bounds.height
  return {
    wPct: clamp(wPct, 1.1, bounds.width * 0.98),
    hPct: clamp(hPct, 1.1, bounds.height * 0.98),
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
}: Props) {
  const stageUnit = useDmxSelector((state) => state.stage.unit)
  const editorRef = useRef<HTMLDivElement | null>(null)
  const snapRef = useRef({
    bodyShape: model.bodyShape,
    emitters: model.customEmitters,
  })
  snapRef.current = { bodyShape: model.bodyShape, emitters: model.customEmitters }
  const [selectedEmitterId, setSelectedEmitterId] = useState<string | null>(
    model.customEmitters[0]?.id ?? null
  )
  const [draggingEmitterId, setDraggingEmitterId] = useState<string | null>(null)
  const bodyBounds = useMemo(() => computeBodyBounds(model), [model])
  const editorFaceM = useMemo(() => fixtureFrontFaceDimensionsM(model), [model])
  const widthUnitLabel = stageUnit === 'ft' ? 'ft' : 'm'
  const bodyWidthDisplay =
    stageUnit === 'ft' ? model.width * FEET_PER_METER : model.width
  const bodyHeightDisplay =
    stageUnit === 'ft' ? model.bodyHeight * FEET_PER_METER : model.bodyHeight
  const bodyDepthDisplay =
    stageUnit === 'ft' ? model.bodyDepth * FEET_PER_METER : model.bodyDepth
  const bodyDiameterDisplay =
    stageUnit === 'ft' ? model.bodyDiameter * FEET_PER_METER : model.bodyDiameter
  const effectiveKind =
    model.kind === 'auto' ? inferFixtureModelKind(fixtureType) : model.kind
  const isPar = effectiveKind === 'parCan'
  const isParCylinder = isPar && model.bodyShape === 'cylinder'
  const isParBox = isPar && model.bodyShape === 'box'
  const showParLayoutTools = isPar && model.customEmitters.length > 0

  const selectedEmitter = useMemo(
    () => model.customEmitters.find((emitter) => emitter.id === selectedEmitterId) ?? null,
    [model.customEmitters, selectedEmitterId]
  )

  useEffect(() => {
    if (selectedEmitterId === null || model.customEmitters.length <= 0) {
      if (model.customEmitters.length > 0) {
        setSelectedEmitterId(model.customEmitters[0].id)
      }
      return
    }
    if (!model.customEmitters.some((emitter) => emitter.id === selectedEmitterId)) {
      setSelectedEmitterId(model.customEmitters[0]?.id ?? null)
    }
  }, [model.customEmitters, selectedEmitterId])

  function updateModelEmitters(nextEmitters: FixtureEmitterDefinition[]) {
    onChange({
      ...model,
      useCustomEmitterLayout: model.useCustomEmitterLayout,
      customEmitters: nextEmitters,
    })
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
    const fallbackChannelIndex = Math.max(
      0,
      Math.min(fixtureType.channels.length - 1, model.customEmitters.length)
    )
    const emitter = initFixtureEmitterDefinition(
      fixtureType.channels.length > 0 ? [fallbackChannelIndex] : []
    )
    emitter.x = 0.5
    emitter.y = 0.5
    emitter.z = 0.65
    updateModelEmitters([...model.customEmitters, emitter])
    setSelectedEmitterId(emitter.id)
  }

  function removeSelectedEmitter() {
    if (!model.useCustomEmitterLayout) return
    if (selectedEmitter === null) return
    const nextEmitters = model.customEmitters.filter(
      (emitter) => emitter.id !== selectedEmitter.id
    )
    updateModelEmitters(nextEmitters)
    setSelectedEmitterId(nextEmitters[0]?.id ?? null)
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
    setSelectedEmitterId(resetModel.customEmitters[0]?.id ?? null)
  }

  function smartAutoGenerateFromNearestLayout() {
    if (!model.useCustomEmitterLayout) return
    const emitters = model.customEmitters
    if (emitters.length === 0) {
      hardResetEmitterLayoutFromDefaults()
      return
    }
    const dims = fixtureFrontFaceDimensionsM(model)
    const n = emitters.length
    const current = emitters.map((e) => ({ x: e.x, y: e.y }))

    const candidates: {
      name: string
      positions: { x: number; y: number }[]
    }[] =
      model.bodyShape === 'cylinder'
        ? [
            { name: 'ring', positions: normalizedParRingEmitterPositions(n) },
            { name: 'honeycomb', positions: normalizedParHoneycombEmitterPositions(n) },
          ]
        : model.bodyShape === 'box'
        ? [
            { name: 'line', positions: normalizedParBoxLineEmitterPositions(n) },
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
      updateModelEmitters(nextEmitters)
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

    const assign = minCostAssignmentGreedy(current, best.positions)
    const targetPerEmitter = emitters.map((_, i) => best.positions[assign[i]!]!)
    const nextEmitters = autoResizeEmittersToFitFace(
      emitters,
      targetPerEmitter,
      dims.faceWidthM,
      dims.faceHeightM
    )
    updateModelEmitters(nextEmitters)
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
    updateModelEmitters(layoutEmittersParRing(model.customEmitters))
  }

  function applyParLayoutHoneycomb() {
    if (!model.useCustomEmitterLayout || model.customEmitters.length === 0) return
    updateModelEmitters(layoutEmittersParHoneycomb(model.customEmitters))
  }

  function applyParLayoutBoxLine() {
    if (!model.useCustomEmitterLayout || model.customEmitters.length === 0) return
    updateModelEmitters(layoutEmittersParBoxLine(model.customEmitters))
  }

  function applyParLayoutBoxGrid() {
    if (!model.useCustomEmitterLayout || model.customEmitters.length === 0) return
    updateModelEmitters(layoutEmittersParBoxGrid(model.customEmitters))
  }

  function toggleEmitterChannel(channelIndex: number) {
    if (!model.useCustomEmitterLayout) return
    if (selectedEmitter === null) return
    const hasChannel = selectedEmitter.channelIndexes.includes(channelIndex)
    const channelIndexes = hasChannel
      ? selectedEmitter.channelIndexes.filter((index) => index !== channelIndex)
      : [...selectedEmitter.channelIndexes, channelIndex].sort((a, b) => a - b)
    updateEmitter(selectedEmitter.id, (current) => ({
      ...current,
      channelIndexes,
    }))
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
      const editor = editorRef.current
      if (editor === null) return
      const rect = editor.getBoundingClientRect()
      if (rect.width <= 1 || rect.height <= 1) return
      const px = ((event.clientX - rect.left) / rect.width) * 100
      const py = ((event.clientY - rect.top) / rect.height) * 100
      const rawX = clamp01(
        (px - bodyBounds.left) / Math.max(0.0001, bodyBounds.width)
      )
      const rawY = clamp01(
        (py - bodyBounds.top) / Math.max(0.0001, bodyBounds.height)
      )
      const { bodyShape, emitters } = snapRef.current
      const { x, y } = snapEmitterXY(
        rawX,
        rawY,
        bodyShape,
        draggingEmitterId,
        emitters,
        event.shiftKey
      )
      updateEmitter(draggingEmitterId, (current) => ({
        ...current,
        x,
        y,
      }))
    }

    const handleMouseUp = () => {
      setDraggingEmitterId(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [bodyBounds.height, bodyBounds.left, bodyBounds.top, bodyBounds.width, draggingEmitterId, model.useCustomEmitterLayout])

  return (
    <Root>
      <SectionTitle>Emitter Layout Editor</SectionTitle>
      <SubText>
        Front-face view: the outline matches the fixture opening in the 3D preview
        (rectangular bodies use the same reduced face width as the renderer). Drag
        emitters to position them; select an emitter for channels, shape, size, and
        depth. Hold <strong>Shift</strong> while dragging to bypass snap (grid,
        center and quarter lines, other emitters, and radial lines on round PAR
        faces).
      </SubText>
      {isPar && (
        <SubText style={{ marginTop: '0.35rem' }}>
          With custom layout off, PAR emitters follow the{' '}
          <strong>Box layout</strong> (single row or grid) or <strong>Round layout</strong>{' '}
          (ring or honeycomb) on the fixture model, including optional auto-expand of the
          face. The PAR buttons below only rearrange positions (ids and channel mapping
          stay put).
        </SubText>
      )}
      <SubText style={{ marginTop: isPar ? '0.28rem' : '0.35rem' }}>
        <strong>Auto-Generate</strong> (all fixture types with custom layout): picks the
        closest ring vs honeycomb on a <strong>round</strong> front face, or single row
        vs grid on a <strong>rectangular</strong> front face, matches it to your current
        layout, then scales emitters to fill the face with small gaps. With no recognized
        body shape, it only resizes emitters at their current positions.
      </SubText>
      <BodyDims>
        <DimsLabel>{isPar ? 'PAR face dimensions:' : 'Body dimensions:'}</DimsLabel>
        <DimsValue>
          {isParCylinder
            ? `Face diameter ${bodyDiameterDisplay.toFixed(2)} ${widthUnitLabel} · Depth ${bodyDepthDisplay.toFixed(2)} ${widthUnitLabel}`
            : isParBox
            ? `Face width ${bodyWidthDisplay.toFixed(2)} ${widthUnitLabel} · Face height ${bodyHeightDisplay.toFixed(2)} ${widthUnitLabel} · Depth ${bodyDepthDisplay.toFixed(2)} ${widthUnitLabel}`
            : model.bodyShape === 'cylinder'
            ? `Diameter ${bodyDiameterDisplay.toFixed(2)} ${widthUnitLabel} · Height ${bodyHeightDisplay.toFixed(2)} ${widthUnitLabel}`
            : `Width ${bodyWidthDisplay.toFixed(2)} ${widthUnitLabel} · Height ${bodyHeightDisplay.toFixed(2)} ${widthUnitLabel} · Depth ${bodyDepthDisplay.toFixed(2)} ${widthUnitLabel}`}
        </DimsValue>
      </BodyDims>
      <Toolbar>
        <ToolButton type="button" onClick={addEmitter} disabled={!model.useCustomEmitterLayout}>
          + Add Emitter
        </ToolButton>
        <ToolButton
          type="button"
          onClick={removeSelectedEmitter}
          disabled={!model.useCustomEmitterLayout || selectedEmitter === null}
        >
          Remove Selected
        </ToolButton>
        <ToolButton
          type="button"
          onClick={resetEmitterLayout}
          disabled={!model.useCustomEmitterLayout}
          title="Match the nearest ring/honeycomb (round face) or row/grid (rect face) to the current layout and resize emitters to fit the face. With no emitters, rebuilds from model defaults."
        >
          Auto-Generate
        </ToolButton>
        {showParLayoutTools && isParCylinder && (
          <>
            <ToolButton
              type="button"
              onClick={applyParLayoutRing}
              disabled={!model.useCustomEmitterLayout}
              title="Even ring on the round face — same pattern as Round layout → Ring on the fixture model."
            >
              Ring (PAR)
            </ToolButton>
            <ToolButton
              type="button"
              onClick={applyParLayoutHoneycomb}
              disabled={!model.useCustomEmitterLayout}
              title="Honeycomb on the round face — same pattern as Round layout → Honeycomb on the fixture model."
            >
              Honeycomb (PAR)
            </ToolButton>
          </>
        )}
        {showParLayoutTools && isParBox && (
          <>
            <ToolButton
              type="button"
              onClick={applyParLayoutBoxLine}
              disabled={!model.useCustomEmitterLayout}
              title="Single row across the face — same pattern as Box layout → Single row on the fixture model."
            >
              Single row (PAR)
            </ToolButton>
            <ToolButton
              type="button"
              onClick={applyParLayoutBoxGrid}
              disabled={!model.useCustomEmitterLayout}
              title="Rows and columns — same pattern as Box layout → Rows & columns on the fixture model."
            >
              Grid (PAR)
            </ToolButton>
          </>
        )}
      </Toolbar>
      {!model.useCustomEmitterLayout && (
        <DisabledNote>
          Custom layout is disabled. Enable it above to edit emitter placement.
        </DisabledNote>
      )}
      <EditorRow>
        <EditorPane
          ref={editorRef}
          $disabled={!model.useCustomEmitterLayout}
          $aspect={bodyBounds.aspect}
        >
          {model.bodyShape === 'cylinder' ? (
            <BodyCircle
              style={{
                left: `${bodyBounds.left}%`,
                top: `${bodyBounds.top}%`,
                width: `${bodyBounds.width}%`,
                height: `${bodyBounds.height}%`,
              }}
            />
          ) : (
            <BodyRect
              style={{
                left: `${bodyBounds.left}%`,
                top: `${bodyBounds.top}%`,
                width: `${bodyBounds.width}%`,
                height: `${bodyBounds.height}%`,
              }}
            />
          )}
          {model.customEmitters.map((emitter, emitterIndex) => {
            const selected = emitter.id === selectedEmitterId
            const vis = emitterVisualSizePercent(
              emitter,
              editorFaceM.faceWidthM,
              editorFaceM.faceHeightM,
              bodyBounds
            )
            return (
              <EmitterDot
                key={emitter.id}
                $x={bodyBounds.left + emitter.x * bodyBounds.width}
                $y={bodyBounds.top + emitter.y * bodyBounds.height}
                $shape={emitter.shape}
                $wPct={vis.wPct}
                $hPct={vis.hPct}
                $selected={selected}
                title={`Emitter ${emitterIndex + 1}`}
                onMouseDown={(event) => {
                  if (!model.useCustomEmitterLayout) return
                  event.preventDefault()
                  setSelectedEmitterId(emitter.id)
                  setDraggingEmitterId(emitter.id)
                }}
              >
                {emitterIndex + 1}
              </EmitterDot>
            )
          })}
        </EditorPane>
        <Sidebar>
          {selectedEmitter === null ? (
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
              <FieldTitle>Assigned Channels</FieldTitle>
              <ChannelList>
                {fixtureType.channels.map((channel, channelIndex) => {
                  const active = selectedEmitter.channelIndexes.includes(channelIndex)
                  return (
                    <ChannelButton
                      key={channelIndex}
                      type="button"
                      $active={active}
                      onClick={() => toggleEmitterChannel(channelIndex)}
                    >
                      {fixtureChannelLabel(channel, channelIndex)}
                    </ChannelButton>
                  )
                })}
              </ChannelList>
            </>
          )}
        </Sidebar>
      </EditorRow>
    </Root>
  )
}

const Root = styled.div`
  margin-top: 0.35rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.35rem;
  padding: 0.55rem 0.65rem 0.65rem;
  background: ${(props) => props.theme.colors.bg.primary};
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
`

const SectionTitle = styled.div`
  font-size: 0.9rem;
  font-weight: 700;
  margin-bottom: 0.2rem;
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
`

const DimsLabel = styled.div`
  font-weight: 700;
  color: ${(props) => props.theme.colors.text.primary};
`

const DimsValue = styled.div`
  color: ${(props) => props.theme.colors.text.secondary};
`

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.55rem;
  margin-bottom: 0.55rem;
`

const ToolButton = styled.button`
  border: 1px solid ${(props) => props.theme.colors.divider};
  background: ${(props) => props.theme.colors.bg.darker};
  color: ${(props) => props.theme.colors.text.primary};
  border-radius: 0.28rem;
  padding: 0.25rem 0.45rem;
  cursor: pointer;
  :disabled {
    cursor: default;
    opacity: 0.45;
  }
`

const EditorRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.85rem;
  align-items: start;
  min-width: 0;

  @media (min-width: 960px) {
    grid-template-columns: minmax(0, 1.65fr) minmax(0, 1fr);
  }
`

const EditorPane = styled.div<{ $disabled: boolean; $aspect: number }>`
  position: relative;
  width: 100%;
  aspect-ratio: ${(props) => props.$aspect};
  border: 1px dashed ${(props) => props.theme.colors.divider};
  border-radius: 0.3rem;
  background:
    linear-gradient(transparent 95%, #ffffff10 95%),
    linear-gradient(90deg, transparent 95%, #ffffff10 95%);
  background-size: 1rem 1rem;
  overflow: hidden;
  opacity: ${(props) => (props.$disabled ? 0.65 : 1)};
  pointer-events: ${(props) => (props.$disabled ? 'none' : 'auto')};
`

const DisabledNote = styled.div`
  margin-bottom: 0.45rem;
  font-size: 0.76rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const BodyRect = styled.div`
  position: absolute;
  z-index: 0;
  border: 1px solid #ffffff26;
  border-radius: 0.25rem;
  background: #ffffff08;
`

const BodyCircle = styled.div`
  position: absolute;
  z-index: 0;
  border: 1px solid #ffffff26;
  border-radius: 999rem;
  background: #ffffff08;
`

const EmitterDot = styled.button<{
  $x: number
  $y: number
  $shape: FixtureEmitterShape
  $wPct: number
  $hPct: number
  $selected: boolean
}>`
  position: absolute;
  left: ${(props) => props.$x}%;
  top: ${(props) => props.$y}%;
  transform: translate(-50%, -50%);
  width: ${(props) => props.$wPct}%;
  height: ${(props) => props.$hPct}%;
  min-width: 0.35rem;
  min-height: 0.35rem;
  max-width: 100%;
  max-height: 100%;
  border-radius: ${(props) => (props.$shape === 'disc' ? '999rem' : '0.2rem')};
  border: 1px solid ${(props) => (props.$selected ? '#6fb0ff' : '#ffffff55')};
  background: ${(props) => (props.$selected ? '#2f7ef4' : '#333c48')};
  color: #f2f6ff;
  font-size: 0.58rem;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  z-index: 1;
`

const Sidebar = styled.div`
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.28rem;
  padding: 0.45rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  align-self: stretch;
  min-width: 0;
  max-width: 100%;
`

const FieldTitle = styled.div`
  font-size: 0.8rem;
  font-weight: 700;
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
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.25rem;
  background: ${(props) => props.theme.colors.bg.darker};
  color: ${(props) => props.theme.colors.text.primary};
  font-size: 0.8rem;
  padding: 0.28rem 0.35rem;
  cursor: pointer;
`

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;
`

const ChannelList = styled.div`
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.25rem;
  padding: 0.3rem;
  flex: 1 1 12rem;
  min-height: 8rem;
  max-height: min(36vh, 22rem);
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`

const ChannelButton = styled.button<{ $active: boolean }>`
  text-align: left;
  border: 1px solid ${(props) => (props.$active ? '#4c8bff' : props.theme.colors.divider)};
  background: ${(props) => (props.$active ? '#1d3f77' : props.theme.colors.bg.darker)};
  color: ${(props) => props.theme.colors.text.primary};
  border-radius: 0.25rem;
  padding: 0.22rem 0.35rem;
  font-size: 0.74rem;
  cursor: pointer;
`
