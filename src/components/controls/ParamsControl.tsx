import React from 'react'
import { ParamKey } from '../../engine/params'
import HsvPad from './HsvPad'
import ParamSlider from './ParamSlider'
import XYpad from './XYpad'

export default function ParamsControl() {

  return (
    <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'row', margin: '0 1rem' }}>
      <HsvPad />
      <XYpad />
      <ParamSlider paramKey={ ParamKey.Black}/>
      <ParamSlider paramKey={ ParamKey.Strobe }/>
      <ParamSlider paramKey={ParamKey.Epicness} />
      <ParamSlider paramKey={ ParamKey.Randomize } />
    </div>
  )
}