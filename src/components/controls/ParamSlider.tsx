import React from 'react'
import {useDispatch} from 'react-redux'
import { setBaseParams } from '../../redux/scenesSlice'
import {ParamKey} from '../../engine/params'
import { useRealtimeSelector } from '../../redux/realtimeStore'
import { useTypedSelector } from '../../redux/store'
import MySlider from '../base/MySlider'

interface Props {
  paramKey: ParamKey
}

export default function ParamSlider({paramKey}: Props) {

  // const param = useRealtimeSelector(state => state.outputParams[paramKey])
  const param = 0.5
  const dispatch = useDispatch()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', alignSelf: 'stretch', marginRight: '1rem' }}>
      <div style={{ flex: '1 0 10rem' }}>
        <MySlider paramKey={paramKey} orientation="vertical"
        />
      </div>
      <div style={{ marginTop: '1rem' }}>{paramKey}</div>
    </div>
  )
}
