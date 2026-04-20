import { Point } from 'math/point'
import {
  getLedPointLayoutForView,
  getLedStringPreviewPathForView,
  LedFixture,
  LedMappingViewMode,
} from 'shared/ledFixtures'
import styled from 'styled-components'

interface Props {
  fixture: LedFixture
  isActive: boolean
  pixelColors?: string[]
  viewMode?: LedMappingViewMode
}

function pointToSvg({ x, y }: Point) {
  return `${x},${1.0 - y}`
}

export default function LedFixturePoints({
  fixture,
  isActive,
  pixelColors,
  viewMode = 'xy',
}: Props) {
  const ledPoints = getLedPointLayoutForView(fixture, viewMode)

  const lineColor = isActive ? '#eef' : '#fff6'
  const fallbackPixelColor = isActive ? '#7ecbff' : '#5fa6d8'
  const dotSize = isActive ? 0.6 : 0.45

  if (fixture.kind === 'grid') {
    const bounds = getPointBounds(ledPoints)

    return (
      <Root>
        <svg
          viewBox="0 0 1 1"
          height="100%"
          width="100%"
          preserveAspectRatio="none"
        >
          <rect
            x={bounds.minX}
            y={1 - bounds.maxY}
            width={Math.max(0, bounds.maxX - bounds.minX)}
            height={Math.max(0, bounds.maxY - bounds.minY)}
            fill="none"
            stroke={lineColor}
            strokeWidth={isActive ? 0.004 : 0.0025}
          />
        </svg>
        <DotLayer>
          {ledPoints.map((point, pointIndex) => (
            <Dot
              key={`${fixture.id}_${pointIndex}`}
              style={{
                left: `${point.x * 100}%`,
                top: `${(1 - point.y) * 100}%`,
                width: `${dotSize}rem`,
                height: `${dotSize}rem`,
                backgroundColor: pixelColors?.[pointIndex] ?? fallbackPixelColor,
                opacity: isActive ? 1 : 0.6,
              }}
            />
          ))}
        </DotLayer>
      </Root>
    )
  }

  const previewPath = getLedStringPreviewPathForView(fixture, viewMode)
  const pathPoints = (previewPath.length > 0 ? previewPath : ledPoints)
    .map(pointToSvg)
    .join(' ')

  return (
    <Root>
      <svg
        viewBox="0 0 1 1"
        height="100%"
        width="100%"
        preserveAspectRatio="none"
      >
        <polyline
          points={pathPoints}
          style={{
            fill: 'none',
            stroke: lineColor,
            strokeWidth: isActive ? '0.005' : '0.003',
          }}
        />
      </svg>
      <DotLayer>
        {ledPoints.map((point, pointIndex) => (
          <Dot
            key={`${fixture.id}_${pointIndex}`}
            style={{
              left: `${point.x * 100}%`,
              top: `${(1 - point.y) * 100}%`,
              width: `${dotSize}rem`,
              height: `${dotSize}rem`,
              backgroundColor: pixelColors?.[pointIndex] ?? fallbackPixelColor,
              opacity: isActive ? 1 : 0.6,
            }}
          />
        ))}
      </DotLayer>
    </Root>
  )
}

const Root = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
`

const DotLayer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`

const Dot = styled.div`
  position: absolute;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  box-shadow: 0 0 0.12rem #000a;
`

function getPointBounds(points: Point[]) {
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const point of points) {
    minX = Math.min(minX, point.x)
    maxX = Math.max(maxX, point.x)
    minY = Math.min(minY, point.y)
    maxY = Math.max(maxY, point.y)
  }

  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
    return {
      minX: 0.5,
      maxX: 0.5,
      minY: 0.5,
      maxY: 0.5,
    }
  }

  return { minX, maxX, minY, maxY }
}
