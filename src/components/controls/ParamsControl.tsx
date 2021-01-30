import React from 'react'
import HsvPad from './HsvPad'
import XYpad from './XYpad'
import ModulationMatrix from '../modulators/ModulationMatrix';

export default function ParamsControl() {

  return (
    <div style={{ display: 'flex', flexDirection: 'row' }}>
      <HsvPad />
      <XYpad />
      <ModulationMatrix />
    </div>
  )
}