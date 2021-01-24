import React from 'react'
import { useTypedSelector } from '../redux/store'
import { GetSin } from '../engine/oscillator'
import { GetValueFromPhase } from '../engine/oscillator'

type Props = {
  lfoIndex: number
}

const stepSize = 2
const height = 100
const width = 150
const padding = 5
const width_ = width - padding * 2
const height_ = height - padding * 2
const lineWidth = 2
const backgroundColor = '#000000'
const lineColor = '#33ff33'

export default function LfoVisualizer({lfoIndex}: Props) {
  // const {Hue, Saturation, Brightness} = useTypedSelector(state => state.params)

  const lfo = GetSin()

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
    <div style={{width: width, height: height, backgroundColor: backgroundColor}}>
      <svg height={height} width={width}>
        <polyline points={GetPoints()} style={{ fill: 'none', stroke: lineColor, strokeWidth: lineWidth}}/>
      </svg>
    </div>
  )
}
