import React from 'react'
import { useRealtimeSelector } from '../../redux/realtimeStore'
import { ParamKey } from '../../engine/params'
import SliderCursor from '../base/SliderCursor'

interface Props {
  paramKey: ParamKey
  radius: number
  orientation: 'vertical' | 'horizontal'
}

export default function ParamCursor({ paramKey, radius, orientation }: Props) {

  const value = useRealtimeSelector(state => state.outputParams[paramKey])

  return (
    <SliderCursor value={value} radius={radius} orientation={orientation} />
  )
}
