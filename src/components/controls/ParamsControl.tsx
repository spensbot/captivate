import Slider from '@material-ui/core/Slider'
import React from 'react'
import { ParamKey } from '../../engine/params'
import HsvPad from './HsvPad'
import ParamSlider from './ParamSlider'
import XYpad from './XYpad'

export default function ParamsControl() {

  return (
    <div style={{ display: 'flex', flexDirection: 'row', margin: '0 1re' }}>
      <HsvPad />
      <XYpad />
      <ParamSlider paramKey={ ParamKey.Black } />
      {/* <ParamSlider paramKey={ ParamKey.Strobe }/>
      <ParamSlider paramKey={ ParamKey.Epicness }/> */}
    </div>
  )
}