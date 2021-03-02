import React from 'react'
import {useDispatch} from 'react-redux'
import {ParamKey} from '../../engine/params'
import MySlider from '../base/MySlider'

interface Props {
  paramKey: ParamKey
}

export default function ParamSlider({paramKey}: Props) {

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '10rem', marginRight: '1rem' }}>
      <div style={{ flex: '1 0 10rem' }}>
        <MySlider paramKey={paramKey} orientation="vertical"
        />
      </div>
      <div style={{ marginTop: '1rem' }}>{paramKey}</div>
    </div>
  )
}
