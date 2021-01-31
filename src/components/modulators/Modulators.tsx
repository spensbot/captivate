import React from 'react'
import { useTypedSelector } from '../../redux/store'
import LfoControl from './LfoControl'
import NewModulator from './NewModulator'

export default function Modulators() {

  const modulators = useTypedSelector(state => state.modulators);

  return (
    <div style={{ display: 'flex', flexDirection: 'row' }}>
      {modulators.map((lfo, index) => {
        return (
          <LfoControl key={index} index={index} />
        )
      })}
      <NewModulator />
    </div>
  )
}