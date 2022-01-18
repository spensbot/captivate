import HsvPad from './HsvPad'
import ParamSlider from './ParamSlider'
import XYpad from './XYpad'
import MidiOverlay_xy from '../base/MidiOverlay_xy'
import styled from 'styled-components'
import Randomizer from './Randomizer'

export default function ParamsControl() {
  return (
    <Root>
      <HsvPad />
      <Sp />
      <MidiOverlay_xy
        actions={[
          { type: 'setBaseParam', paramKey: 'x' },
          { type: 'setBaseParam', paramKey: 'y' },
          { type: 'setBaseParam', paramKey: 'width' },
          { type: 'setBaseParam', paramKey: 'height' },
        ]}
      >
        <XYpad />
      </MidiOverlay_xy>
      <Sp />
      <Randomizer />
      <Sp />
      <ParamSlider param={'black'} />
      <ParamSlider param={'strobe'} />
      <ParamSlider param={'epicness'} />
      <ParamSlider param={'randomize'} />
    </Root>
  )
}

const Root = styled.div`
  /* flex: 0 0 auto; */
  display: flex;
  flex-direction: row;
`

const Sp = styled.div`
  min-width: 1rem;
`
