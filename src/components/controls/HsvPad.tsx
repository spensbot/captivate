import React from 'react'
import SVpad from './SVpad'
import Hue from './Hue'

export default function HsvPad() {

  return (
    <div style={{width: 200, marginRight: '1rem'}}>
      <SVpad />
      <Hue />
    </div>
  )
}
