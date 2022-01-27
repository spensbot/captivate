import { Param } from '../../engine/params'
import SliderBase from '../base/SliderBase'
import SliderCursor from '../base/SliderCursor'
import { useActiveLightScene } from '../redux/store'
import { useDispatch } from 'react-redux'
import { setBaseParams } from '../redux/controlSlice'
import ParamCursor from './ParamCursor'
import { SliderMidiOverlay } from '../base/MidiOverlay'

interface Props {
  param: Param
}

export default function ParamSlider({ param }: Props) {
  const radius = 0.4

  const value = useActiveLightScene((scene) => scene.baseParams[param])
  const dispatch = useDispatch()
  const onChange = (newVal: number) => {
    dispatch(
      setBaseParams({
        [param]: newVal,
      })
    )
  }

  return (
    <SliderMidiOverlay
      action={{ type: 'setBaseParam', paramKey: param }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: '10rem',
        marginRight: '1rem',
      }}
    >
      <div style={{ flex: '1 0 10rem' }}>
        <SliderBase orientation="vertical" radius={radius} onChange={onChange}>
          <ParamCursor orientation="vertical" param={param} radius={radius} />
          <SliderCursor
            orientation="vertical"
            value={value}
            radius={radius}
            color="#fff"
            border
          />
        </SliderBase>
      </div>
      <div style={{ marginTop: '1rem' }}>{param}</div>
    </SliderMidiOverlay>
  )
}
