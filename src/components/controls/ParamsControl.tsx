import React from 'react'
import { ParamKey } from '../../engine/params'
import HsvPad from './HsvPad'
import ParamSlider from './ParamSlider'
import XYpad from './XYpad'
import MidiOverlay_xy from '../base/MidiOverlay_xy'

export default function ParamsControl() {

  return (
    <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'row', margin: '0 1rem' }}>
      <HsvPad />
      <MidiOverlay_xy actionX={{type: 'setBaseParam', paramKey: ParamKey.X}} actionY={{type: 'setBaseParam', paramKey: ParamKey.Y}}>
        <XYpad />
      </MidiOverlay_xy>
      <ParamSlider paramKey={ ParamKey.Black}/>
      <ParamSlider paramKey={ ParamKey.Strobe }/>
      <ParamSlider paramKey={ParamKey.Epicness} />
      <ParamSlider paramKey={ ParamKey.Randomize } />
    </div>
  )
}