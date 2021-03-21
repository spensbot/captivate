import React, { useState } from 'react'
import SliderBase from './SliderBase'
import SliderCursor from './SliderCursor'

interface Params {
  value?: number
  radius: number
  orientation: 'vertical' | 'horizontal'
  onChange: (newVal: number) => void
  color?: string
}

export default function Slider({ value, radius, orientation, onChange, color }: Params) {
  const [localVal, setLocalVal] = useState(0.0)

  const localOnChange = (newVal: number) => {
    if (value === undefined) {
      setLocalVal(newVal)
    }
    onChange(newVal)
  }

  return (
    <SliderBase radius={radius} orientation={orientation} onChange={localOnChange}>
      <SliderCursor value={value === undefined ? localVal : value} radius={radius} orientation={orientation} color={color}/>
    </SliderBase>
  )
}
