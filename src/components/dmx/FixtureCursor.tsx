import React from 'react'
import { useDispatch } from 'react-redux'
import { useTypedSelector } from '../../redux/store'
import Cursor from '../base/Cursor'
import { setSelectedFixture } from '../../redux/dmxSlice'

export default function FixtureCursor({ index }: { index: number }) {
  const fixture = useTypedSelector(state => state.dmx.universe[index])
  const selectedFixture = useTypedSelector(state => state.dmx.selectedFixture)
  const dispatch = useDispatch()

  const isSelected = selectedFixture === index

  return isSelected ? (
    <Cursor x={fixture.window?.x?.pos || 0.5} y={fixture.window?.y?.pos || 0.5} withHorizontal withVertical color="#fffc" />
  ) : (
    <Cursor onClick={() => dispatch(setSelectedFixture(index))} x={fixture.window?.x?.pos || 0.5} y={fixture.window?.y?.pos || 0.5} color="#fff7" />
  )
}
