import React from 'react'
import { useRealtimeSelector } from '../../redux/realtimeStore'
import Cursor from '../controls/Cursor'
import { GetValueFromPhase, GetPhase } from '../../engine/oscillator'
import { useTypedSelector } from '../../redux/store'

export default function LfoCursor({index}: {index: number}) {

  const time = useRealtimeSelector(state => state.time)
  const lfo = useTypedSelector(state => state.modulators[index])
  const phase = GetPhase(lfo, time.beats)
  const value = GetValueFromPhase(lfo, phase)

  return (
    <Cursor x={phase} y={value} color="#fff" withVertical/>
  )
}
