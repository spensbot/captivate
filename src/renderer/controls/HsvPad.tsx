import SVpad from './SVpad'
import Hue from './Hue'
import MidiOverlay_xy from '../base/MidiOverlay_xy'
import { SliderMidiOverlay } from '../base/MidiOverlay'

export default function HsvPad() {
  return (
    <div style={{ width: 200 }}>
      <MidiOverlay_xy
        actions={[
          { type: 'setBaseParam', paramKey: 'saturation' },
          { type: 'setBaseParam', paramKey: 'brightness' },
        ]}
      >
        <SVpad />
      </MidiOverlay_xy>
      <SliderMidiOverlay action={{ type: 'setBaseParam', paramKey: 'hue' }}>
        <Hue />
      </SliderMidiOverlay>
    </div>
  )
}
