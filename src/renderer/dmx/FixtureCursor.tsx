import React from 'react'
import { useDispatch } from 'react-redux'
import { useDmxSelector } from '../redux/store'
import Cursor from '../base/Cursor'
import { setSelectedFixture } from '../redux/dmxSlice'
import Window2D2 from '../base/Window2D2'
import { window2DToParentCoords } from 'shared/window'

export default function FixtureCursor({ index }: { index: number }) {
  const fixture = useDmxSelector((state) => state.universe[index])
  const fixtureType = useDmxSelector((state) => state.fixtureTypesByID[fixture.type])
  const activeFixture = useDmxSelector((state) => state.activeFixture)
  const dispatch = useDispatch()

  const isSelected = activeFixture === index

  function onClick(e: React.MouseEvent) {
    if (!e.defaultPrevented) {
      e.preventDefault()
      dispatch(setSelectedFixture(index))
    }
  }

  let x = 0.5
  let y = 0.5
  const window = fixture.window

  if (window) {
    if (window.x !== undefined) x = window.x.pos
    if (window.y !== undefined) y = window.y.pos
  }

  const subWindows = fixtureType.subFixtures
    .map(sub => sub.relative_window ? window2DToParentCoords(sub.relative_window, fixture.window) : undefined)

  const color = isSelected ? '#fff' : '#fff7';

  return <div>
    <div style={{ zIndex: -2 }}>
      {subWindows.map(subWindow => subWindow ? (
        <Cursor x={subWindow.x?.pos ?? x} y={subWindow.y?.pos ?? y} color={color} />
      ) : undefined)}
    </div>
    {isSelected ? (
      <div style={{ zIndex: -1 }}>
        {/* <Cursor x={fixture.window?.x?.pos || 0.5} y={fixture.window?.y?.pos || 0.5} withHorizontal withVertical color="#fffc" />
        <Window2D window2D={ fixture.window || {} }/> */}
        <Window2D2 window2D={fixture.window} />
      </div>
    ) : (
      <div style={{ zIndex: 1 }}>
        <Cursor onClick={onClick} x={x} y={y} color={color} />
      </div>
    )}
  </div>

}
