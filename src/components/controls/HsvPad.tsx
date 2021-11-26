import React from 'react'
import SVpad from './SVpad'
import Hue from './Hue'
import MidiOverlay_xy from '../base/MidiOverlay_xy'
import { ParamKey } from '../../engine/params'

export default function HsvPad() {

  return (
    <div style={{ width: 200 }}>
      <MidiOverlay_xy actionX={{type: 'setBaseParam', paramKey: ParamKey.Saturation}} actionY={{type: 'setBaseParam', paramKey: ParamKey.Brightness}}>
        <SVpad />
      </MidiOverlay_xy>
      <Hue />
    </div>
  )
}
