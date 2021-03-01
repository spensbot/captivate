import React from 'react'
import { useRealtimeSelector } from '../../redux/realtimeStore'
import { ParamKey } from '../../engine/params'

const THICK = 0.8 // rem
const thick = `${THICK}rem`

interface Props {
  paramKey: ParamKey
  orientation: 'vertical' | 'horizontal'
}

export default function SliderCursor({ paramKey, orientation }: Props) {
  
  const paramOut = useRealtimeSelector(state => state.outputParams[paramKey])
  const percent = paramOut * 100

  const style: React.CSSProperties = {
    position: 'absolute',
    width: thick,
    height: thick,
    borderRadius: thick,
    bottom: orientation === 'vertical' ? `${percent}%` : 0,
    left: orientation === 'vertical' ? 0 : `${percent}%`,
    backgroundColor: '#fff5'
  }

  return (
    <div style={style} />
  )
}
