import SVpad from './SVpad'
import Hue from './Hue'
import MidiOverlay_xy from '../base/MidiOverlay_xy'
import { SliderMidiOverlay } from '../base/MidiOverlay'
import styled from 'styled-components'

export default function HsvPad() {
  return (
    <Root>
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
    </Root>
  )
}

const Root = styled.div`
  width: 200;
  border: 1px solid ${(props) => props.theme.colors.divider};
`
