import React from 'react'
import {ParamKey} from '../../engine/params'
import SliderBase from '../base/SliderBase'
import SliderCursor from '../base/SliderCursor'
import {useTypedSelector} from '../../redux/store'
import { useDispatch } from 'react-redux'
import { setBaseParams } from '../../redux/scenesSlice'
import ParamCursor from './ParamCursor'
import MidiOverlay from '../base/MidiOverlay'

interface Props {
  paramKey: ParamKey
}

export default function ParamSlider({ paramKey }: Props) {
  const radius = 0.4
  
  const value = useTypedSelector(state => state.scenes.byId[state.scenes.active].baseParams[paramKey])
  const dispatch = useDispatch();
  const onChange = (newVal: number) => {
    dispatch(setBaseParams({
      [paramKey]: newVal
    }))
  }

  return (
    <MidiOverlay action={{ type: 'setBaseParam', paramKey: paramKey }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '10rem', marginRight: '1rem' }}>
      <div style={{ flex: '1 0 10rem' }}>
        <SliderBase orientation="vertical" radius={radius} onChange={onChange}>
          <ParamCursor orientation="vertical" paramKey={paramKey} radius={radius} />
          <SliderCursor orientation="vertical" value={value} radius={radius} color="#fff" border/>
        </SliderBase>
      </div>
      <div style={{ marginTop: '1rem' }}>{paramKey}</div>
    </MidiOverlay>
  )
}
