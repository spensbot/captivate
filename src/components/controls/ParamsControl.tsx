import React from 'react'
import HsvPad from './HsvPad'
import XYpad from './XYpad'

export default function ParamsControl() {

  return (
    <div style={{ display: 'flex', flexDirection: 'row' }}>
      <HsvPad />
      <XYpad />
    </div>
  )
}