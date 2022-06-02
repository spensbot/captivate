import React from 'react'
import { useRealtimeSelector } from '../../redux/realtimeStore'
import { useTypedSelector } from '../../redux/store'
import Cursor from '../base/Cursor'

export default function SVCursor() {

  const outputParams = useRealtimeSelector(state => state.outputParams)
  let xOut = outputParams.Saturation
  let yOut = outputParams.Brightness

  const baseParams = useTypedSelector(state => state.scenes.byId[state.scenes.active].baseParams)
  const x = baseParams.Saturation
  const y = baseParams.Brightness

  return (
    <Cursor x={xOut} y={yOut} color="#fff" withHorizontal withVertical/>
  )
}
