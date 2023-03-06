import styled from 'styled-components'
import useDragMapped, { MappedPos } from 'renderer/hooks/useDragMapped'
import { useDispatch } from 'react-redux'
import { useDmxSelector } from 'renderer/redux/store'
import { distanceBetween, Point } from 'math/point'
import {
  addLedFixturePoint,
  removeLedFixturePoint,
  updateLedFixturePoint,
} from 'renderer/redux/dmxSlice'
import { secondaryEnabled } from 'renderer/base/keyUtil'
import { indexArray } from 'shared/util'
import LedFixturePoints from './LedFixturePoints'

interface Props {}

export default function LedFixturePlacement({}: Props) {
  const numLedFixtures = useDmxSelector((dmx) => dmx.led.ledFixtures.length)
  const activeLedFixture = useDmxSelector((dmx) => {
    if (dmx.led.activeFixture !== null) {
      return dmx.led.ledFixtures[dmx.led.activeFixture]
    } else {
      return null
    }
  })

  const dispatch = useDispatch()

  const [dragContainer, onMouseDown] = useDragMapped((pos, e) => {
    if (activeLedFixture !== null) {
      let point: Point = {
        x: pos.x,
        y: pos.y,
      }

      let nearbyIndex = isOnPoint(pos, activeLedFixture.points)
      if (nearbyIndex !== null) {
        if (secondaryEnabled(e)) {
          dispatch(removeLedFixturePoint(nearbyIndex))
        } else {
          dispatch(
            updateLedFixturePoint({ index: nearbyIndex, newPoint: point })
          )
        }
      } else {
        if (secondaryEnabled(e)) {
          dispatch(addLedFixturePoint(point))
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
    .sort(([_ia, a], [_ib, b]) => a - b)

  if (sortedByDistance.length === 0) {
    return null
  } else {
    return sortedByDistance[0][0]
  }
}
