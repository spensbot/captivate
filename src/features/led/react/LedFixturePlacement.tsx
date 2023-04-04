import styled from 'styled-components'
import useDragMapped, { MappedPos } from 'features/ui/react/hooks/useDragMapped'
import { useDispatch } from 'react-redux'
import { useDmxSelector } from 'renderer/redux/store'
import { distanceBetween, Point } from 'features/utils/math/point'
import {
  addLedFixturePoint,
  removeLedFixturePoint,
  updateLedFixturePoint,
} from 'features/fixtures/redux/fixturesSlice'
import { secondaryEnabled } from 'features/ui/react/base/keyUtil'
import { fMap, indexArray } from 'features/utils/util'
import LedFixturePoints from './LedFixturePoints'
import Cursor from 'features/ui/react/base/Cursor'

interface Props {}

let draggedPointIndex: number | null = null

export default function LedFixturePlacement({}: Props) {
  const numLedFixtures = useDmxSelector((dmx) => dmx.led.ledFixtures.length)
  const activeLedFixture = useDmxSelector((dmx) => {
    return fMap(dmx.led.activeFixture, (index) => dmx.led.ledFixtures[index])
  })

  const dispatch = useDispatch()

  const [dragContainer, onMouseDown] = useDragMapped((pos, e, status) => {
    if (activeLedFixture !== null) {
      let point: Point = {
        x: pos.x,
        y: pos.y,
      }

      if (status === 'Start') {
        let nearbyIndex = isOnPoint(pos, activeLedFixture.points)
        if (nearbyIndex === null) {
          if (secondaryEnabled(e)) {
            dispatch(addLedFixturePoint(point))
          }
        } else {
          if (secondaryEnabled(e)) {
            dispatch(removeLedFixturePoint(nearbyIndex))
          } else {
            draggedPointIndex = nearbyIndex
          }
        }
      } else if (status === 'End') {
        draggedPointIndex = null
      } else {
        if (draggedPointIndex !== null) {
          console.log('!== null')
          dispatch(
            updateLedFixturePoint({ index: draggedPointIndex, newPoint: point })
          )
        } else {
          console.log('null')
        }
      }
    }
  })

  return (
    <Root>
      <Background ref={dragContainer} onMouseDown={onMouseDown}>
        <Vertical />
        <Horizontal />
        {indexArray(numLedFixtures).map((index) => (
          <LedFixturePoints key={index} index={index} />
        ))}
        {activeLedFixture !== null &&
          indexArray(activeLedFixture.points.length).map((index) => {
            let point = activeLedFixture.points[index]
            let isStart = index === 0
            let radius = isStart ? 0.5 : 0.5
            let color = isStart ? '#afa' : '#fff'
            let bgColor = isStart ? '#afa' : undefined

            return (
              <Cursor
                x={point.x}
                y={point.y}
                radius={radius}
                color={color}
                bgColor={bgColor}
              />
            )
          })}
      </Background>
    </Root>
  )
}

const Root = styled.div`
  padding: 1rem;
  height: 100%;
  box-sizing: border-box;
`

const Background = styled.div`
  height: 100%;
  position: relative;
  background-color: #111;
`

const Vertical = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background-color: #fff3;
`

const Horizontal = styled.div`
  position: absolute;
  top: 50%;
  height: 1px;
  left: 0;
  right: 0;
  background-color: #fff3;
`

function isOnPoint(mappedPos: MappedPos, points: Point[]): number | null {
  let sortedByDistance = points
    .map<[number, number]>((p, i) => [i, distanceBetween(mappedPos, p)])
    .filter(([_i, a]) => a < 0.05)
    .sort(([_ia, a], [_ib, b]) => a - b)

  if (sortedByDistance.length === 0) {
    return null
  } else {
    console.log(sortedByDistance[0])

    return sortedByDistance[0][0]
  }
}
