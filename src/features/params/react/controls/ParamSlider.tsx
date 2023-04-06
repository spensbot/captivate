import { DefaultParam } from '../../shared/params'
import SliderBase from '../../../ui/react/base/SliderBase'
import SliderCursor from '../../../ui/react/base/SliderCursor'
import { useDispatch } from 'react-redux'
import { setBaseParams } from '../../../../renderer/redux/controlSlice'
import ParamCursor from './ParamCursor'
import { SliderMidiOverlay } from 'features/midi/react/MidiOverlay'
import ParamXButton from './ParamXButton'
import { useBaseParam } from 'features/params/redux'

interface Props {
  param: DefaultParam
  splitIndex: number
}

export default function ParamSlider({ param, splitIndex }: Props) {
  const radius = 0.4

  const value = useBaseParam(param, splitIndex)
  const dispatch = useDispatch()
  const onChange = (newVal: number) => {
    dispatch(
      setBaseParams({
        splitIndex,
        params: {
          [param]: newVal,
        },
      })
    )
  }

  if (value === undefined) return null

  const content = (
    <>
      <div style={{ flex: '1 0 10rem' }}>
        <SliderBase orientation="vertical" radius={radius} onChange={onChange}>
          <ParamCursor
            orientation="vertical"
            param={param}
            radius={radius}
            splitIndex={splitIndex}
          />
          <SliderCursor
            orientation="vertical"
            value={value}
            radius={radius}
            color="#fff"
            border
          />
        </SliderBase>
      </div>
      <ParamXButton splitIndex={splitIndex} params={[param]} />
      <div style={{ marginTop: '1rem' }}>{param}</div>
    </>
  )

  const wrapperStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '10rem',
    marginRight: '1rem',
    position: 'relative',
  }

  return splitIndex === 0 ? (
    <SliderMidiOverlay
      action={{ type: 'setBaseParam', paramKey: param }}
      style={wrapperStyle}
    >
      {content}
    </SliderMidiOverlay>
  ) : (
    <div style={wrapperStyle}>{content}</div>
  )
}