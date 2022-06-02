import React from 'react'
import { useRealtimeSelector } from '../../redux/realtimeStore'
import { useTypedSelector } from '../../redux/store'
import Cursor from '../base/Cursor'

export default function XYCursor() {
  const outputParams = useRealtimeSelector(state => state.outputParams)
  const xOut = outputParams.X
  const yOut = outputParams.Y

  const baseParams = useTypedSelector(state => state.scenes.byId[state.scenes.active].baseParams)
  const x = baseParams.X
  const y = baseParams.Y

  return (
    <Cursor x={xOut} y={yOut} color="#fff" withHorizontal withVertical/>
  )
}
