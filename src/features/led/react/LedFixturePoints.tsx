import { Point } from 'features/utils/math/point'
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
      return `${x},${1.0 - y}`
    })
    .join(' ')

  return (
    <svg
      viewBox="0 0 1 1"
      height="100%"
      width="100%"
      style={{ objectFit: 'fill' }}
      preserveAspectRatio="none"
    >
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
        lineWidth={isActive ? '0.005' : '0.003'}
      />
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
