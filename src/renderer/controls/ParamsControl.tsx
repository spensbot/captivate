import HsvPad from './HsvPad'
import ParamSlider from './ParamSlider'
import XYpad from './XYpad'
import styled from 'styled-components'
import Randomizer from './Randomizer'
import XYAxispad from './XYAxisPad'
import ParamAddButton from './ParamAddButton'

interface Params {
  splitIndex: number | null
}

export default function ParamsControl({ splitIndex }: Params) {
  return (
    <Root>
      <HsvPad splitIndex={splitIndex} />
      <XYpad splitIndex={splitIndex} />
      <XYAxispad splitIndex={splitIndex} />
      <Randomizer splitIndex={splitIndex} />
      <ParamSlider param={'black'} splitIndex={splitIndex} />
      <ParamSlider param={'strobe'} splitIndex={splitIndex} />
      <ParamSlider param={'epicness'} splitIndex={splitIndex} />
      <ParamAddButton splitIndex={splitIndex} />
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: row;
`
