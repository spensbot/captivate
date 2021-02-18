import React from 'react'
import { useTypedSelector } from '../../redux/store'
import FixtureCursor from './FixtureCursor'
import useDragMapped from '../hooks/useDragMapped'
import { useDispatch } from 'react-redux'
import { setFixtureWindow } from '../../redux/dmxSlice'

export default function FixturePlacement() {
  const universe = useTypedSelector(state => state.dmx.universe)
  const selectedFixture = useTypedSelector(state => state.dmx.selectedFixture)
  const dispatch = useDispatch()

  const [dragContainer, onMouseDown] = useDragMapped((x, y, e) => {
    if (selectedFixture !== null) {
      dispatch(setFixtureWindow({
        index: selectedFixture,
        window2D: {
          x: {width: 0, pos: x},
          y: {width: 0, pos: y}
        }
      }))
    }
  })

  const indexes = Array.from(Array(universe.length).keys())

  const cursors = indexes.map(index => {
    return (
      <FixtureCursor key={index} index={index}/>
    )
  })

  return (
    <div style={{ backgroundColor: '#0007', width: '100%', height: '60%', overflow: 'hidden', padding: '0.5rem'}}>
      <div ref={dragContainer} onMouseDown={onMouseDown} style={{position: 'relative', width: '100%', height: '100%'}}>
        {cursors}
      </div>
    </div>
  )
}
