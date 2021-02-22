import React from 'react'
import {useDispatch} from 'react-redux'
import { setBaseParams } from '../../redux/scenesSlice'
import {ParamKey} from '../../engine/params'
import { useRealtimeSelector } from '../../redux/realtimeStore'
import { useTypedSelector } from '../../redux/store'
import Slider from '@material-ui/core/Slider'

interface Props {
  paramKey: ParamKey
}

export default function ParamSlider({paramKey}: Props) {

  const param = useRealtimeSelector(state => state.outputParams[paramKey])
  const dispatch = useDispatch()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', alignSelf: 'stretch', marginRight: '1rem' }}>
      <div style={{ flex: '1 0 0' }}>
        <Slider value={param} step={0.01} min={0} max={1} valueLabelDisplay="auto" orientation="vertical"
          onChange={(e, newValue) => {
            dispatch(setBaseParams({[paramKey]: newValue}))
          }}
        />
      </div>
      <div style={{ marginTop: '1rem' }}>{paramKey}</div>
    </div>
  )
}
