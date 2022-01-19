import Slider from '../base/Slider'
import { useScenesSelector } from '../redux/store'
import { useDispatch } from 'react-redux'
import { setMaster } from '../redux/scenesSlice'
import { SliderMidiOverlay } from '../base/MidiOverlay'

export default function MasterSlider() {
  const master = useScenesSelector((state) => state.master)
  const dispatch = useDispatch()

  return (
    <SliderMidiOverlay
      action={{ type: 'setMaster' }}
      style={{
        flex: '0 1 25rem',
        width: '80%',
        marginBottom: '1rem',
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
