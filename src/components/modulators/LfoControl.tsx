import React from 'react'
import LfoMenu from './LfoMenu'
import LfoVisualizer from './LfoVisualizer'
import LfoCursor from './LfoCursor'

type Props = {
  index: number
}

const stepSize = 2
const height = 150
const width = 200
const padding = 5
const width_ = width - padding * 2
const height_ = height - padding * 2
const lineWidth = 2
const backgroundColor = '#000000'
const lineColor = '#33ff33'

export default function LfoControl({index}: Props) {

  return (
    <div style={{margin: '1rem'}}>
      <LfoMenu index={index} />
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <LfoVisualizer index={index}/>
        <LfoCursor index={index}/>
      </div>
    </div>
  )
}
