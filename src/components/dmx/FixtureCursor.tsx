import React from 'react'
import { useTypedSelector } from '../../redux/store'
import Cursor from '../base/Cursor'

export default function FixtureCursor({ index }: { index: number }) {
  const fixture = useTypedSelector(state => state.dmx.universe[index])
  const selectedFixture = useTypedSelector(state => state.dmx.selectedFixture)

  const isSelected = selectedFixture === index

  return isSelected ? (
    <Cursor x={fixture.window?.x?.pos || 0.5} y={fixture.window?.y?.pos || 0.5} withHorizontal withVertical color="#fffa" />
  ) : (
    <Cursor x={fixture.window?.x?.pos || 0.5} y={fixture.window?.y?.pos || 0.5} color="#fff7" />
  )
}
