import SVpad from './SVpad'
import Hue from './Hue'
import MidiOverlay_xy from '../base/MidiOverlay_xy'
import { SliderMidiOverlay } from '../base/MidiOverlay'
import { makeSetBaseParamAction } from '../redux/deviceState'
import styled from 'styled-components'

interface Props {
  splitIndex: number
}

export default function HsvPad({ splitIndex }: Props) {
  return (
    <Root>
      <MidiOverlay_xy
        splitIndex={splitIndex}
        labels={['S', 'V']}
        actions={[
          makeSetBaseParamAction(splitIndex, 'saturation'),
          makeSetBaseParamAction(splitIndex, 'brightness'),
        ]}
      >
        <SVpad splitIndex={splitIndex} />
      </MidiOverlay_xy>
      <SliderMidiOverlay
        action={makeSetBaseParamAction(splitIndex, 'hue')}
      >
        <Hue splitIndex={splitIndex} />
      </SliderMidiOverlay>
    </Root>
  )
}

const Root = styled.div`
  width: 200px;
  border: 1px solid ${(props) => props.theme.colors.divider};
  margin-right: 1rem;
`
