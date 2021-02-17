import React from 'react'
import { useTypedSelector } from '../../redux/store'
import FixtureCursor from './FixtureCursor'

export default function FixturePlacement() {
  const universeSize = useTypedSelector(state => state.dmx.universe.length)

  const indexes = Array.from(Array(universeSize).keys())

  const cursors = indexes.map(index => {
    return (
      <FixtureCursor key={index} index={index}/>
    )
  })

  return (
    <div style={{backgroundColor: '#0007', width: '100%', height: '50%', position: 'relative', overflow: 'hidden'}}>
      {cursors}
    </div>
  )
}
