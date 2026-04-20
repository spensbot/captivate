import React from 'react'
import { useDispatch } from 'react-redux'
import { useDmxSelector } from '../redux/store'
import Cursor from '../base/Cursor'
import { setSelectedFixture } from '../redux/dmxSlice'
import Window2D2 from '../base/Window2D2'
import { Window2D_t, WindowAxis, window2DToParentCoords } from 'shared/window'
import { FixtureRotation } from '../../shared/dmxFixtures'
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

/** In-plane length below this ⇒ forward is nearly perpendicular to the pad (head-on); use a dot. */
const ARROW_IN_PLANE_MIN = 0.14

type DirectionGlyph =
  | { kind: 'arrow'; x: number; y: number }
  | { kind: 'dot' }

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

  const subWindows = fixtureType.subFixtures.map((sub) =>
    sub.relative_window
      ? window2DToParentCoords(sub.relative_window, fixture.window)
      : fixture.window
  )

  const cursorColor = fixtureCursorColor(index, isSelected)
  const subCursorColor = fixtureSubCursorColor(index, isSelected)
  const cursorFillColor = fixtureCursorFillColor(index, isSelected)
  const cursorThickness = isSelected ? 2 : 1

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
