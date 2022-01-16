import HsvPad from './HsvPad'
import ParamSlider from './ParamSlider'
import XYpad from './XYpad'
import MidiOverlay_xy from '../base/MidiOverlay_xy'
import styled from 'styled-components'

export default function ParamsControl() {
  return (
    <div
      style={{
        flex: '0 0 auto',
        display: 'flex',
        flexDirection: 'row',
        margin: '0 1rem',
      }}
    >
      <HsvPad />
      <Spacer />
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
      <Spacer />
      <ParamSlider param={'black'} />
      <ParamSlider param={'strobe'} />
      <ParamSlider param={'epicness'} />
      <ParamSlider param={'randomize'} />
    </div>
  )
}

const Spacer = styled.div`
  width: 1rem;
`
