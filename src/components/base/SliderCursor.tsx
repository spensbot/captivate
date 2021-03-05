import React from 'react'

interface Props {
  value: number
  orientation: 'vertical' | 'horizontal'
  radius: number
  color?: string
  border?: boolean
}

export default function SliderCursor({ value, orientation, radius, color="#fffa", border }: Props) {
  const percent = value * 100
  const v = orientation === 'vertical'
  const r = `${radius}rem`
  const d = `${radius*2}rem`

  return (
    <div style={{
      position: 'absolute',
      width: d,
      height: d,
      borderRadius: r,
      bottom: v ? `${percent}%` : 0,
      left: v ? 0 : `${percent}%`,
      border: border ? '2px solid ' + color : undefined,
      backgroundColor: border ? undefined : color,
      transform: `translate(${v ? 0 : -radius}rem, ${v ? radius : 0}rem)`
    }} />
  )
}
