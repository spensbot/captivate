import Slider from '../base/Slider'
import { useControlSelector } from '../redux/store'
import { useDispatch } from 'react-redux'
import { setMaster } from '../redux/controlSlice'
import { SliderMidiOverlay } from '../base/MidiOverlay'

export default function MasterSlider() {
  const master = useControlSelector((state) => state.master)
  const dispatch = useDispatch()

  return (
    <SliderMidiOverlay
      action={{ type: 'setMaster' }}
      style={{
        flex: '0 1 25rem',
        width: '80%',
        // marginBottom: '1rem',
        padding: '1rem 0',
        // maxHeight: '30rem',
      }}
    >
      <Slider
        value={master}
        radius={0.5}
        onChange={(newVal: number) => {
          dispatch(setMaster(newVal))
        }}
        orientation="vertical"
      />
    </SliderMidiOverlay>
  )
}
