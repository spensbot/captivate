import React from 'react'
import { useDispatch } from 'react-redux'
import { useDmxSelector } from '../redux/store'
import Cursor from '../base/Cursor'
import { setSelectedFixture } from '../redux/dmxSlice'
import Window2D2 from '../base/Window2D2'
import { window2DToParentCoords } from 'shared/window'
import {
  fixtureCursorColor,
  fixtureCursorFillColor,
  fixtureSubCursorColor,
} from './fixtureColors'

export default function FixtureCursor({ index }: { index: number }) {
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

  let x = 0.5
  let y = 0.5
  const window = fixture.window

  if (window) {
    if (window.x !== undefined) x = window.x.pos
    if (window.y !== undefined) y = window.y.pos
  }

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
      <div>
        {subWindows.map((subWindow, subIndex) => (
          <Cursor
            key={subIndex}
            x={subWindow?.x?.pos ?? x}
            y={subWindow?.y?.pos ?? y}
            color={subCursorColor}
            thickness={1.5}
          />
        ))}
      </div>
      {isSelected ? (
        <div>
          <Cursor
            x={x}
            y={y}
            color={cursorColor}
            bgColor={cursorFillColor}
            thickness={cursorThickness}
          />
          <Window2D2 window2D={fixture.window} />
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
        </div>
      )}
    </div>
  )
}
