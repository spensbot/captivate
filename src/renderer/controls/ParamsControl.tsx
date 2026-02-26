import HsvPad from './HsvPad'
import ParamSlider from './ParamSlider'
import XyPad from './XyParamsPad'
import styled from 'styled-components'
import Randomizer from './Randomizer'
import XYAxispad from './XYAxisPad'
import ParamAddButton from './ParamAddButton'
import { useDmxSelector } from 'renderer/redux/store'
import { getCustomChannels } from 'renderer/redux/dmxSlice'
import StrobeControl from './StrobeControl'

interface Params {
  splitIndex: number
}

export default function ParamsControl({ splitIndex }: Params) {
  let customChannels = useDmxSelector((dmx) => getCustomChannels(dmx))

  return (
    <Root>
      <HsvPad splitIndex={splitIndex} />
      <ParamSlider param={'white'} splitIndex={splitIndex} />
      <ParamSlider param={'warmWhite'} splitIndex={splitIndex} />
      <ParamSlider param={'amber'} splitIndex={splitIndex} />
      <ParamSlider param={'uv'} splitIndex={splitIndex} />
      <XyPad splitIndex={splitIndex} />
      <XYAxispad splitIndex={splitIndex} />
      <Randomizer splitIndex={splitIndex} />
      <StrobeControl splitIndex={splitIndex} />
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
