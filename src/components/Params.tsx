import React from 'react'
import HsvPad from './HsvPad'
import XYpad from './XYpad'

export default function Params() {

  return (
    <div style={{ display: 'flex', flexDirection: 'row', '& div': {margin: '1rem'} }}>
      <HsvPad />
      <XYpad />
    </div>
  )
}