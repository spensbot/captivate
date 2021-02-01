import React from 'react'
import { useRealtimeSelector } from '../../redux/realtimeStore'
import Cursor from '../controls/Cursor'
import { GetValueFromPhase, GetPhase } from '../../engine/oscillator'
import { useTypedSelector } from '../../redux/store'

export default function LfoCursor({index, padding}: {index: number, padding: number}) {

  const time = useRealtimeSelector(state => state.time)
  const lfo = useTypedSelector(state => state.modulators[index].lfo)
  const phase = GetPhase(lfo, time.beats)
  const value = GetValueFromPhase(lfo, phase)

  const scale = 1 - padding * 2

  return (
    <Cursor x={phase * scale + padding} y={value * scale + padding} color="#fff" withVertical/>
  )
}
