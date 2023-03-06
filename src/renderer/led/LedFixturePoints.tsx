import { Point } from 'math/point'
import { useDmxSelector } from 'renderer/redux/store'
import styled from 'styled-components'

interface Props {
  index: number
}

function DynamicSvg({
  points,
  lineColor,
  lineWidth,
}: {
  points: Point[]
  lineColor: string
  lineWidth: string
}) {
  const pointsString = points
    .map(({ x, y }) => {
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg viewBox="0 0 1 1" height="10rem" width="10rem">
      <polyline
        points={pointsString}
        style={{ fill: 'none', stroke: lineColor, strokeWidth: lineWidth }}
      />
    </svg>
  )
}

export default function LedFixturePoints({ index }: Props) {
  const points = useDmxSelector((dmx) => dmx.led.ledFixtures[index].points)
  const isActive = useDmxSelector((dmx) => dmx.led.activeFixture === index)

  return (
    <Root>
      <DynamicSvg
        points={points}
        lineColor={isActive ? '#eee' : '#fff5'}
        lineWidth={isActive ? '0.01' : '0.01'}
      />
    </Root>
  )
}

const Root = styled.div``
