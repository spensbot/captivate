import React from 'react'
import { useTypedSelector } from '../../redux/store'
import ModulatorControl from './ModulatorControl'
import NewModulator from './NewModulator'

export default function Modulators() {

  const modulatorCount = useTypedSelector(state => state.scenes.byId[state.scenes.active].modulators.length);

  const indexes = Array.from(Array(modulatorCount).keys())

  return (
    <div style={{ display: 'flex', flexDirection: 'row', overflow: 'scroll', padding: '1rem'}}>
      {indexes.map(index => {
        return (
          <ModulatorControl key={index} index={index} />
        )
      })}
      <NewModulator />
    </div>
  )
}