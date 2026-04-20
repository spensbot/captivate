import { useTypedSelector } from '../redux/store'
import { useRealtimeSelector } from '../redux/realtimeStore'
import styled from 'styled-components'

interface Props {
  type: 'midi' | 'dmx' | 'link'
}

export default function ConnectionStatus({ type }: Props) {
  if (type === 'link') {
    const isEnabled = useRealtimeSelector((state) => state.time.isEnabled)
    const numPeers = useRealtimeSelector((state) => state.time.numPeers)
    const peerCount = Number.isFinite(numPeers) ? Math.max(0, Math.floor(numPeers)) : 0
    const title = isEnabled
      ? `Ableton Link on — ${peerCount} Link peer${peerCount === 1 ? '' : 's'}`
      : 'Ableton Link off'

    return (
      <Root title={title}>
        <Text>link</Text>
        <LinkIndicatorSquare $enabled={isEnabled}>{peerCount}</LinkIndicatorSquare>
      </Root>
    )
  }

  const isConnected = useTypedSelector(
    (state) => state.gui[type].connected.length > 0
  )

  const color = isConnected ? '#0f0' : '#f00'

  return (
    <Root title={isConnected ? `${type} connected` : `No ${type} connection`}>
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

const LinkIndicatorSquare = styled.div<{ $enabled: boolean }>`
  width: 0.95rem;
  height: 0.75rem;
  margin-left: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background-color: ${(p) => (p.$enabled ? '#0f0' : '#f00')};
  color: #000;
  font-size: 0.52rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  border-radius: 0.06rem;
`
