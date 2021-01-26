import React from 'react'
import { useTypedSelector } from '../../redux/store'
import LfoVisualizer from './LfoVisualizer'
import NewModulator from './NewModulator'

export default function Modulators() {

  const modulators = useTypedSelector(state => state.modulators);

  return (
    <div style={{ display: 'flex', flexDirection: 'row' }}>
      {modulators.map((lfo, index) => {
        return (
          <LfoVisualizer key={index} lfo={lfo} index={index} />
        )
      })}
      <NewModulator />
    </div>
  )
}