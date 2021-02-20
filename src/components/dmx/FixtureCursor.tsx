import React from 'react'
import { useDispatch } from 'react-redux'
import { useTypedSelector } from '../../redux/store'
import Cursor from '../base/Cursor'
import { setSelectedFixture } from '../../redux/dmxSlice'
import Window2D from '../base/Window2D'

export default function FixtureCursor({ index }: { index: number }) {
  const fixture = useTypedSelector(state => state.dmx.universe[index])
  const selectedFixture = useTypedSelector(state => state.dmx.selectedFixture)
  const dispatch = useDispatch()

  const isSelected = selectedFixture === index

  function onClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    dispatch(setSelectedFixture(index))
  }

  return isSelected ? (
    <div style={{zIndex: -1}}>
      <Cursor x={fixture.window?.x?.pos || 0.5} y={fixture.window?.y?.pos || 0.5} withHorizontal withVertical color="#fffc" />
      <Window2D window2D={ fixture.window || {} }/>
    </div>
  ) : (
    <div style={{zIndex: 1}}>
        <Cursor onClick={onClick} x={fixture.window?.x?.pos || 0.5} y={fixture.window?.y?.pos || 0.5} color="#fff7" />
    </div>
  )
}
