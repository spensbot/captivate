import React from 'react'
import { useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { useDmxSelector } from '../redux/store'
import Cursor from '../base/Cursor'
import { incrementFixtureWindow, setSelectedFixture } from '../redux/dmxSlice'
import Window2D2 from '../base/Window2D2'
import { Window2D_t, WindowAxis, window2DToParentCoords } from 'shared/window'
import {
  computeEmitterCentroid,
  emittersForSubfixtureIndex,
  FixtureEmitterDefinition,
  FixtureRotation,
  resolvedEmittersForFixtureType,
} from '../../shared/dmxFixtures'
import {
  fixtureCursorColor,
  fixtureCursorFillColor,
  fixtureSubCursorColor,
} from './fixtureColors'

interface Props {
  index: number
  horizontalAxis?: WindowAxis
  verticalAxis?: WindowAxis
  showSubFixtures?: boolean
  showDirection?: boolean
  /**
   * When true, draws one motion-anchor dot per subfixture (centroid of its emitters on the
   * fixture face), scaled by the fixture motion window — not one dot per emitter.
   */
  showEmitterLayout?: boolean
}

function fallbackAxisPos(axis: WindowAxis): number {
  return axis === 'z' ? 1 : 0.5
}

function windowAxisPos(
  window: Window2D_t | undefined,
  axis: WindowAxis
): number {
  return window?.[axis]?.pos ?? fallbackAxisPos(axis)
}

function rotationAxisValue(
  rotation: FixtureRotation | undefined,
  axis: WindowAxis
): number {
  const value = rotation?.[axis]
  return Number.isFinite(value) ? Number(value) : 0
}

function axisComponent(
  axis: WindowAxis,
  vector: { x: number; y: number; z: number }
): number {
  if (axis === 'x') return vector.x
  if (axis === 'y') return vector.y
  return vector.z
}

function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function rotatedForwardVector(rotation: FixtureRotation | undefined): {
  x: number
  y: number
  z: number
} {
  // Forward vector starts along +Z and follows the same XYZ Euler axis order
  // used by the 3D preview root rotation.
  const xRad = degToRad(rotationAxisValue(rotation, 'x'))
  const yRad = degToRad(rotationAxisValue(rotation, 'y'))
  const zRad = degToRad(rotationAxisValue(rotation, 'z'))

  const sinX = Math.sin(xRad)
  const cosX = Math.cos(xRad)
  const sinY = Math.sin(yRad)
  const cosY = Math.cos(yRad)
  const sinZ = Math.sin(zRad)
  const cosZ = Math.cos(zRad)

  const x = cosX * sinY * cosZ + sinX * sinZ
  const y = cosX * sinY * sinZ - sinX * cosZ
  const z = cosX * cosY

  return { x, y, z }
}

/**
 * When a motion-window axis width is unset/zero, match {@link Window2D2}'s displayed extent
 * (`width + 0.05` with zero stored width → 0.05), so emitter dots stay within the crosshair
 * instead of spanning ±0.5 of the pad (which looked wildly oversized vs the outline).
 */
const DEFAULT_EMITTER_SPAN_ON_PAD = 0.05

/** In-plane length below this ⇒ forward is nearly perpendicular to the pad (head-on); use a dot. */
const ARROW_IN_PLANE_MIN = 0.14

type DirectionGlyph =
  | { kind: 'arrow'; x: number; y: number }
  | { kind: 'dot' }

function clampNormalized(value: number): number {
  if (!Number.isFinite(value)) return 0.5
  return Math.max(0, Math.min(1, value))
}

function normalizedAxisWidth(window: Window2D_t | undefined, axis: WindowAxis): number {
  const w = window?.[axis]?.width
  if (Number.isFinite(w) && (w ?? 0) > 0) {
    return Number(w)
  }
  return DEFAULT_EMITTER_SPAN_ON_PAD
}

function emitterOffsetsOnPad(
  window: Window2D_t | undefined,
  emitter: FixtureEmitterDefinition
): { dx: number; dy: number; dz: number } {
  const xw = normalizedAxisWidth(window, 'x')
  const yw = normalizedAxisWidth(window, 'y')
  const zw = normalizedAxisWidth(window, 'z')

  const ex = clampNormalized(emitter.x)
  const ey = clampNormalized(emitter.y)
  const ez = clampNormalized(emitter.z)

  return {
    dx: (ex - 0.5) * xw,
    dy: (0.5 - ey) * yw,
    dz: (ez - 0.5) * zw,
  }
}

function emitterPadCoordinates(
  scopeWindow: Window2D_t | undefined,
  anchorWindow: Window2D_t,
  emitter: FixtureEmitterDefinition,
  horizontalAxis: WindowAxis,
  verticalAxis: WindowAxis
): { x: number; y: number } {
  const { dx, dy, dz } = emitterOffsetsOnPad(scopeWindow, emitter)
  const xh = axisComponent(horizontalAxis, { x: dx, y: dy, z: dz })
  const xv = axisComponent(verticalAxis, { x: dx, y: dy, z: dz })

  let h = windowAxisPos(anchorWindow, horizontalAxis) + xh
  let v = windowAxisPos(anchorWindow, verticalAxis) + xv
  if (!Number.isFinite(h)) h = fallbackAxisPos(horizontalAxis)
  if (!Number.isFinite(v)) v = fallbackAxisPos(verticalAxis)
  return { x: clampNormalized(h), y: clampNormalized(v) }
}

/** Synthetic emitter at group centroid for pad projection only. */
function motionAnchorEmitterFromEmitters(
  emitters: FixtureEmitterDefinition[]
): FixtureEmitterDefinition | null {
  const c = computeEmitterCentroid(emitters)
  if (!c || emitters.length === 0) return null
  const ref = emitters[0]!
  return {
    id: `${ref.id}-motion-anchor`,
    x: c.x,
    y: c.y,
    z: c.z,
    size: ref.size,
    shape: ref.shape,
    channelIndexes: [],
  }
}

function resolvedSubWindow(
  fixtureWindow: Window2D_t,
  sub: { relative_window?: Window2D_t }
): Window2D_t {
  return sub.relative_window
    ? window2DToParentCoords(sub.relative_window, fixtureWindow)
    : fixtureWindow
}

function EmitterLayoutMarkers({
  emitters,
  scopeWindow,
  anchorWindow,
  horizontalAxis,
  verticalAxis,
  dotColor,
}: {
  emitters: FixtureEmitterDefinition[]
  scopeWindow: Window2D_t | undefined
  anchorWindow: Window2D_t
  horizontalAxis: WindowAxis
  verticalAxis: WindowAxis
  dotColor: string
}) {
  const anchorEmitter = motionAnchorEmitterFromEmitters(emitters)
  if (!anchorEmitter) {
    return null
  }
  const { x: ex, y: ey } = emitterPadCoordinates(
    scopeWindow,
    anchorWindow,
    anchorEmitter,
    horizontalAxis,
    verticalAxis
  )
  return (
    <div
      aria-hidden
      title="Subfixture motion anchor (emitter-layout centroid)"
      style={{
        position: 'absolute',
        top: `${(1 - ey) * 100}%`,
        left: `${ex * 100}%`,
        width: '0.38rem',
        height: '0.38rem',
        borderRadius: '999px',
        background: `${dotColor}`,
        border: '1px solid #000a',
        opacity: 0.9,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 7,
      }}
    />
  )
}

function projectedDirectionGlyph(
  rotation: FixtureRotation | undefined,
  horizontalAxis: WindowAxis,
  verticalAxis: WindowAxis
): DirectionGlyph {
  const forward = rotatedForwardVector(rotation)
  const x = axisComponent(horizontalAxis, forward)
  const y = axisComponent(verticalAxis, forward)
  const length = Math.hypot(x, y)

  if (!Number.isFinite(length) || length < ARROW_IN_PLANE_MIN) {
    return { kind: 'dot' }
  }

  return {
    kind: 'arrow',
    x: x / length,
    y: y / length,
  }
}

function DirectionArrow({
  x,
  y,
  direction,
  color,
  isSelected,
}: {
  x: number
  y: number
  direction: { x: number; y: number }
  color: string
  isSelected: boolean
}) {
  const angle = Math.atan2(direction.y, direction.x)
  const style: React.CSSProperties = {
    position: 'absolute',
    top: `${(1 - y) * 100}%`,
    left: `${x * 100}%`,
    width: isSelected ? '1.5rem' : '1.25rem',
    height: isSelected ? '1.5rem' : '1.25rem',
    transform: `translate(-50%, -50%) rotate(${angle}rad)`,
    pointerEvents: 'none',
    zIndex: isSelected ? 6 : 4,
  }

  const strokeWidth = isSelected ? 1.45 : 1.2

  return (
    <svg style={style} viewBox="-9 -9 18 18" aria-hidden>
      <line
        x1="-4.3"
        y1="0"
        x2="4.1"
        y2="0"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <polyline
        points="1.7,-2.2 4.8,0 1.7,2.2"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function padNormalizedDeltas(
  e: MouseEvent,
  pad: HTMLElement
): { dx: number; dy: number } {
  const rect = pad.getBoundingClientRect()
  return {
    dx: e.movementX / rect.width,
    dy: -e.movementY / rect.height,
  }
}

function incrementPayloadForAxis(
  fixtureIndex: number,
  axis: WindowAxis,
  delta: number
): {
  index: number
  dWidth?: number
  dHeight?: number
  dDepth?: number
} {
  const base = { index: fixtureIndex }
  if (axis === 'x') return { ...base, dWidth: delta }
  if (axis === 'y') return { ...base, dHeight: delta }
  return { ...base, dDepth: delta }
}

function WindowResizeHandles({
  window2D,
  horizontalAxis,
  verticalAxis,
  fixtureIndex,
}: {
  window2D: Window2D_t
  horizontalAxis: WindowAxis
  verticalAxis: WindowAxis
  fixtureIndex: number
}) {
  const dispatch = useDispatch()

  const hWin = window2D[horizontalAxis]
  const vWin = window2D[verticalAxis]

  const xPos =
    hWin?.pos ?? (horizontalAxis === 'z' ? 1 : 0.5)
  const yPos =
    vWin?.pos ?? (verticalAxis === 'z' ? 1 : 0.5)

  const width = (hWin?.width ?? 0) + 0.05
  const height = (vWin?.width ?? 0) + 0.05

  const handleStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 10,
    borderRadius: 2,
    background: '#fff',
    boxShadow: '0 0 0 1px #000a',
    pointerEvents: 'auto',
    touchAction: 'none',
    userSelect: 'none',
  }

  function startResize(
    e: React.MouseEvent,
    kind: 'left' | 'right' | 'top' | 'bottom'
  ) {
    e.preventDefault()
    e.stopPropagation()
    const padCandidate = (e.currentTarget as HTMLElement).closest('[data-fixture-pad]')
    if (!(padCandidate instanceof HTMLElement)) {
      return
    }
    const fixtureResizePad: HTMLElement = padCandidate

    function onMove(ev: MouseEvent) {
      const { dx, dy } = padNormalizedDeltas(ev, fixtureResizePad)
      if (kind === 'left') {
        if (!hWin) return
        dispatch(
          incrementFixtureWindow(
            incrementPayloadForAxis(fixtureIndex, horizontalAxis, -dx)
          )
        )
      } else if (kind === 'right') {
        if (!hWin) return
        dispatch(
          incrementFixtureWindow(
            incrementPayloadForAxis(fixtureIndex, horizontalAxis, dx)
          )
        )
      } else if (kind === 'top') {
        if (!vWin) return
        dispatch(
          incrementFixtureWindow(
            incrementPayloadForAxis(fixtureIndex, verticalAxis, dy)
          )
        )
      } else {
        if (!vWin) return
        dispatch(
          incrementFixtureWindow(
            incrementPayloadForAxis(fixtureIndex, verticalAxis, -dy)
          )
        )
      }
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const horizTitle = `Resize ${horizontalAxis.toUpperCase()} span`
  const vertTitle = `Resize ${verticalAxis.toUpperCase()} span`

  return (
    <>
      {hWin ? (
        <>
          <div
            aria-label={`${horizTitle} (left edge)`}
            title={`${horizTitle} (left)`}
            style={{
              ...handleStyle,
              left: `${(xPos - width / 2) * 100}%`,
              top: `${(1 - yPos) * 100}%`,
              width: '0.65rem',
              height: '0.65rem',
              cursor: 'ew-resize',
              transform: 'translate(-50%, -50%)',
            }}
            onMouseDown={(e) => startResize(e, 'left')}
          />
          <div
            aria-label={`${horizTitle} (right edge)`}
            title={`${horizTitle} (right)`}
            style={{
              ...handleStyle,
              left: `${(xPos + width / 2) * 100}%`,
              top: `${(1 - yPos) * 100}%`,
              width: '0.65rem',
              height: '0.65rem',
              cursor: 'ew-resize',
              transform: 'translate(-50%, -50%)',
            }}
            onMouseDown={(e) => startResize(e, 'right')}
          />
        </>
      ) : null}
      {vWin ? (
        <>
          <div
            aria-label={`${vertTitle} (top edge)`}
            title={`${vertTitle} (top)`}
            style={{
              ...handleStyle,
              left: `${xPos * 100}%`,
              top: `${(1 - (yPos + height / 2)) * 100}%`,
              width: '0.65rem',
              height: '0.65rem',
              cursor: 'ns-resize',
              transform: 'translate(-50%, -50%)',
            }}
            onMouseDown={(e) => startResize(e, 'top')}
          />
          <div
            aria-label={`${vertTitle} (bottom edge)`}
            title={`${vertTitle} (bottom)`}
            style={{
              ...handleStyle,
              left: `${xPos * 100}%`,
              top: `${(1 - (yPos - height / 2)) * 100}%`,
              width: '0.65rem',
              height: '0.65rem',
              cursor: 'ns-resize',
              transform: 'translate(-50%, -50%)',
            }}
            onMouseDown={(e) => startResize(e, 'bottom')}
          />
        </>
      ) : null}
    </>
  )
}

function DirectionDot({
  x,
  y,
  color,
  isSelected,
}: {
  x: number
  y: number
  color: string
  isSelected: boolean
}) {
  const size = isSelected ? '0.55rem' : '0.45rem'
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        top: `${(1 - y) * 100}%`,
        left: `${x * 100}%`,
        width: size,
        height: size,
        borderRadius: '999px',
        background: color,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: isSelected ? 6 : 4,
        boxShadow: '0 0 0 1px #0008',
      }}
    />
  )
}

export default function FixtureCursor({
  index,
  horizontalAxis = 'x',
  verticalAxis = 'y',
  showSubFixtures = true,
  showDirection = true,
  showEmitterLayout = true,
}: Props) {
  const fixture = useDmxSelector((state) => state.universe[index])
  const fixtureType = useDmxSelector(
    (state) => state.fixtureTypesByID[fixture.type]
  )
  const activeFixture = useDmxSelector((state) => state.activeFixture)
  const dispatch = useDispatch()

  const isSelected = activeFixture === index

  function onClick(e: React.MouseEvent) {
    if (!e.defaultPrevented) {
      e.preventDefault()
      dispatch(setSelectedFixture(index))
    }
  }

  const window = fixture.window
  const x = windowAxisPos(window, horizontalAxis)
  const y = windowAxisPos(window, verticalAxis)
  const directionGlyph = projectedDirectionGlyph(
    fixture.rotation,
    horizontalAxis,
    verticalAxis
  )

  const subWindows =
    fixtureType !== undefined
      ? fixtureType.subFixtures.map((sub) =>
          sub.relative_window
            ? window2DToParentCoords(sub.relative_window, fixture.window)
            : fixture.window
        )
      : []

  const cursorColor = fixtureCursorColor(index, isSelected)
  const subCursorColor = fixtureSubCursorColor(index, isSelected)
  const cursorFillColor = fixtureCursorFillColor(index, isSelected)
  const cursorThickness = isSelected ? 2 : 1

  const emitterLayouts = useMemo(() => {
    if (!showEmitterLayout || fixtureType === undefined) {
      return null
    }
    const resolved = resolvedEmittersForFixtureType(fixtureType)
    if (fixtureType.subFixtures.length === 0) {
      return [
        {
          scope: fixture.window,
          anchor: fixture.window,
          emitters: resolved,
        },
      ]
    }
    return fixtureType.subFixtures
      .map((sub, subIndex) => {
        const anchor = resolvedSubWindow(fixture.window, sub)
        const emitters = emittersForSubfixtureIndex(
          fixtureType,
          resolved,
          subIndex
        )
        return {
          scope: anchor,
          anchor,
          emitters,
        }
      })
      .filter((layout) => layout.emitters.length > 0)
  }, [fixture.window, fixture.type, fixtureType, showEmitterLayout])

  return (
    <div>
      {showSubFixtures && (
        <div>
          {subWindows.map((subWindow, subIndex) => (
            <Cursor
              key={subIndex}
              x={windowAxisPos(subWindow, horizontalAxis)}
              y={windowAxisPos(subWindow, verticalAxis)}
              color={subCursorColor}
              thickness={1.5}
            />
          ))}
        </div>
      )}
      {emitterLayouts?.map((layout, layoutIndex) => (
        <EmitterLayoutMarkers
          key={`emitters-${layoutIndex}`}
          emitters={layout.emitters}
          scopeWindow={layout.scope}
          anchorWindow={layout.anchor}
          horizontalAxis={horizontalAxis}
          verticalAxis={verticalAxis}
          dotColor={subCursorColor}
        />
      ))}
      {isSelected ? (
        <div>
          <Cursor
            x={x}
            y={y}
            color={cursorColor}
            bgColor={cursorFillColor}
            thickness={cursorThickness}
          />
          {showDirection &&
            (directionGlyph.kind === 'dot' ? (
              <DirectionDot x={x} y={y} color={cursorColor} isSelected={true} />
            ) : (
              <DirectionArrow
                x={x}
                y={y}
                direction={{ x: directionGlyph.x, y: directionGlyph.y }}
                color={cursorColor}
                isSelected={true}
              />
            ))}
          <Window2D2
            window2D={fixture.window}
            horizontalAxis={horizontalAxis}
            verticalAxis={verticalAxis}
          />
          <WindowResizeHandles
            window2D={fixture.window}
            horizontalAxis={horizontalAxis}
            verticalAxis={verticalAxis}
            fixtureIndex={index}
          />
        </div>
      ) : (
        <div>
          <Cursor
            onClick={onClick}
            x={x}
            y={y}
            color={cursorColor}
            bgColor={cursorFillColor}
            thickness={cursorThickness}
          />
          {showDirection &&
            (directionGlyph.kind === 'dot' ? (
              <DirectionDot x={x} y={y} color={cursorColor} isSelected={false} />
            ) : (
              <DirectionArrow
                x={x}
                y={y}
                direction={{ x: directionGlyph.x, y: directionGlyph.y }}
                color={cursorColor}
                isSelected={false}
              />
            ))}
        </div>
      )}
    </div>
  )
}
