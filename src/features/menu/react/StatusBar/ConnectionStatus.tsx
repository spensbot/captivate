import { useTypedSelector } from '../../../../renderer/redux/store'
import styled from 'styled-components'

interface Props {
  type: 'midi' | 'dmx'
}

export default function ConnectionStatus({ type }: Props) {
  const isConnected = useTypedSelector(
    (state) => state.gui[type].connected.length > 0
  )

  const color = isConnected ? '#0f0' : '#f00'

  return (
    <Root>
      <Text>{type}</Text>
      <Square style={{ backgroundColor: color }} />
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  align-items: center;
  padding: 0rem 0.2rem;
  font-size: 0.8rem;
`

const Text = styled.span`
  color: #fff7;
`

const Square = styled.div`
  width: 0.6rem;
  height: 0.6rem;
  margin-left: 0.5rem;
`
