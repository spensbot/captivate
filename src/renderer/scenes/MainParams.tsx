import ParamsControl from '../controls/ParamsControl'
import styled from 'styled-components'
import GroupSelection from './GroupSelection'

export default function MainParams() {
  return (
    <Root>
      <GroupSelection splitIndex={null} />
      <ParamsControl splitIndex={null} />
    </Root>
  )
}

const Root = styled.div``
