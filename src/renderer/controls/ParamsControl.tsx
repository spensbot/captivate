import HsvPad from './HsvPad'
import ParamSlider from './ParamSlider'
import XyPad from './XyParamsPad'
import styled from 'styled-components'
import type { CSSProperties } from 'react'
import Randomizer from './Randomizer'
import XYAxispad from './XYAxisPad'
import ParamAddButton from './ParamAddButton'
import { useDmxSelector } from 'renderer/redux/store'
import { getCustomChannels } from 'renderer/redux/dmxSlice'
import StrobeControl from './StrobeControl'
import GoboControl from './GoboControl'
import ZParamsPad from './ZParamsPad'

interface Params {
  splitIndex: number
}

const auxColorSliderStyle: CSSProperties = {
  marginRight: '0.35rem',
}

const auxColorSliderLastStyle: CSSProperties = {
  marginRight: '0.85rem',
}

export default function ParamsControl({ splitIndex }: Params) {
  const customChannels = useDmxSelector((dmx) => getCustomChannels(dmx))

  return (
    <Root>
      <HsvPad splitIndex={splitIndex} />
      <AuxColorRoot>
        <ParamSlider
          param={'white'}
          splitIndex={splitIndex}
          hideRemoveButton
          label={'W'}
          wrapperStyle={auxColorSliderStyle}
        />
        <ParamSlider
          param={'warmWhite'}
          splitIndex={splitIndex}
          hideRemoveButton
          label={'WW'}
          wrapperStyle={auxColorSliderStyle}
        />
        <ParamSlider
          param={'amber'}
          splitIndex={splitIndex}
          hideRemoveButton
          label={'A'}
          wrapperStyle={auxColorSliderStyle}
        />
        <ParamSlider
          param={'uv'}
          splitIndex={splitIndex}
          hideRemoveButton
          label={'UV'}
          wrapperStyle={auxColorSliderLastStyle}
        />
      </AuxColorRoot>
      <XyPad splitIndex={splitIndex} />
      <ZParamsPad splitIndex={splitIndex} />
      <XYAxispad splitIndex={splitIndex} />
      <Randomizer splitIndex={splitIndex} />
      <StrobeControl splitIndex={splitIndex} />
      <GoboControl splitIndex={splitIndex} />
      <ParamSlider param={'intensity'} splitIndex={splitIndex} />
      {Array.from(customChannels).map((name) => (
        <ParamSlider key={name} param={name} splitIndex={splitIndex} />
      ))}
      <ParamAddButton splitIndex={splitIndex} />
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  width: max-content;
  min-width: 100%;

  > * {
    flex: 0 0 auto;
  }
`

const AuxColorRoot = styled.div`
  display: flex;
  align-items: flex-start;
`

