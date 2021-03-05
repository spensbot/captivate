import React from 'react'
import SliderBase from './SliderBase'
import SliderCursor from './SliderCursor'

interface Params {
  value: number
  radius: number
  orientation: 'vertical' | 'horizontal'
  onChange: (newVal: number) => void
  color?: string
}

export default function Slider({value, radius, orientation, onChange, color}: Params) {
  return (
    <SliderBase radius={radius} orientation={orientation} onChange={onChange}>
      <SliderCursor value={value} radius={radius} orientation={orientation} color={color}/>
    </SliderBase>
  )
}
