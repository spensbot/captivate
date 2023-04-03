import SVpad from './SVpad'
import Hue from './Hue'
import MidiOverlay_xy from 'features/midi/react/MidiOverlay_xy'
import { SliderMidiOverlay } from 'features/midi/react/MidiOverlay'
import styled from 'styled-components'

interface Props {
  splitIndex: number
}

export default function HsvPad({ splitIndex }: Props) {
  return splitIndex === 0 ? (
    <Root>
      <MidiOverlay_xy
        actions={[
          { type: 'setBaseParam', paramKey: 'saturation' },
          { type: 'setBaseParam', paramKey: 'brightness' },
        ]}
      >
        <SVpad splitIndex={splitIndex} />
      </MidiOverlay_xy>
      <SliderMidiOverlay action={{ type: 'setBaseParam', paramKey: 'hue' }}>
        <Hue splitIndex={splitIndex} />
      </SliderMidiOverlay>
    </Root>
  ) : (
    <Root>
      <SVpad splitIndex={splitIndex} />
      <Hue splitIndex={splitIndex} />
    </Root>
  )
}

const Root = styled.div`
  width: 200;
  border: 1px solid ${(props) => props.theme.colors.divider};
  margin-right: 1rem;
`
