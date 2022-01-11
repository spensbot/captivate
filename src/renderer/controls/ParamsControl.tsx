import HsvPad from './HsvPad'
import ParamSlider from './ParamSlider'
import XYpad from './XYpad'
import MidiOverlay_xy from '../base/MidiOverlay_xy'

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
      <ParamSlider paramKey={'black '} />
      <ParamSlider paramKey={'strobe'} />
      <ParamSlider paramKey={'epicness'} />
      <ParamSlider paramKey={'randomize'} />
    </div>
  )
}
