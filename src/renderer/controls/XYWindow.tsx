import React from 'react'
import { useRealtimeSelector } from '../redux/realtimeStore'
import Window2D from '../base/Window2D'

export default function XYWindow() {
  const { Height, Width, X, Y } = useRealtimeSelector(
    (state) => state.outputParams
  )

  return (
    <Window2D
      window2D={{
        x: {
          pos: X,
          width: Width,
        },
        y: {
          pos: Y,
          width: Height,
        },
      }}
    />
  )
}
