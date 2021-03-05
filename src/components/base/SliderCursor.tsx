import React from 'react'

interface Props {
  value: number
  orientation: 'vertical' | 'horizontal'
  radius: number
  border?: boolean
}

export default function SliderCursor({ value, orientation, radius, border }: Props) {
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
      border: border ? '2px solid #fffa' : undefined,
      backgroundColor: border ? undefined : '#fff5',
      transform: `translate(${v ? 0 : radius}, ${v ? radius : 0}rem)`
    }} />
  )
}
