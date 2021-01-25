import React from 'react'
import { Lfo } from '../engine/oscillator'
import { GetValueFromPhase } from '../engine/oscillator'
import { useDispatch } from 'react-redux'
import useDragBasic from './hooks/useDragBasic'
import { incrementModulator } from '../redux/modulatorsSlice'

type Props = {
  lfo: Lfo
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

export default function LfoVisualizer({lfo, index}: Props) {
  const dispatch = useDispatch();

  const [dragContainer, onMouseDown] = useDragBasic((e) => {
    const dx = - e.movementX / width
    const dy = e.movementY / height
    dispatch(incrementModulator({
      index: index,
      phaseShift: e.metaKey ? 0 : dx,
      flip: e.metaKey ? 0 : dy,
      symmetricSkew: e.metaKey ? dx : 0,
      skew: e.metaKey ? dy : 0,
    }))
  })

  function GetPoints() {
    const zeros = Array(width_ / stepSize + 1).fill(0)

    const pointsArray = zeros.map((_, i) => {
      const x = i * stepSize / width_
      const y = 1 - GetValueFromPhase(lfo, x)
      return [x * width_ + padding, y * height_ + padding]
    })

    const points = pointsArray.reduce((accum, point) => {
      return accum + `${point[0]},${point[1]}` + ' '
    }, "")
    
    return points
  }

  return (
    <div ref={dragContainer} onMouseDown={onMouseDown} style={{width: width, height: height, backgroundColor: backgroundColor, margin: '1rem'}}>
      <svg height={height} width={width}>
        <polyline points={GetPoints()} style={{ fill: 'none', stroke: lineColor, strokeWidth: lineWidth}}/>
      </svg>
    </div>
  )
}
