import { useControlSelector, useTypedSelector } from '../redux/store'
import { useRealtimeSelector } from '../redux/realtimeStore'
import {
  StatusBarConnectionLabel,
  StatusBarConnectionRow,
  StatusBarStatusDot,
} from './statusBarUi'

interface Props {
  type: 'midi' | 'dmx' | 'link'
}

function dmxIndicatorState(
  connected: string[],
  connectable: string[]
): { color: string; title: string } {
  const liveCount = connected.length
  const enabledCount = connectable.length
  const enabledLiveCount = connectable.filter((id) =>
    connected.includes(id)
  ).length

  if (liveCount > 0) {
    if (enabledCount === 0 || enabledLiveCount > 0) {
      return {
        color: '#78dc82',
        title:
          liveCount === 1
            ? 'DMX output active (1 adapter connected)'
            : `DMX output active (${liveCount} adapters connected)`,
      }
    }
  }

  if (enabledCount > 0) {
    return {
      color: '#e8a020',
      title:
        enabledLiveCount === 0
          ? 'DMX enabled in Connections but adapter not open — check USB cable, drivers, or port in use'
          : 'DMX partially connected — some enabled adapters are not open',
    }
  }

  return {
    color: '#e05a5a',
    title: 'No DMX output — enable a USB adapter in Connections',
  }
}

export default function ConnectionStatus({ type }: Props) {
  const linkEnabled = useRealtimeSelector((state) => state.time.isEnabled)
  const numPeers = useRealtimeSelector((state) => state.time.numPeers)
  const dmxConnected = useTypedSelector((state) => state.gui.dmx.connected)
  const midiConnected = useTypedSelector((state) => state.gui.midi.connected)
  const dmxConnectable = useControlSelector(
    (state) => state.device.connectable.dmx
  )

  if (type === 'link') {
    const peerCount = Number.isFinite(numPeers) ? Math.max(0, Math.floor(numPeers)) : 0
    const title = linkEnabled
      ? `Ableton Link on — ${peerCount} Link peer${peerCount === 1 ? '' : 's'}`
      : 'Ableton Link off'

    return (
      <StatusBarConnectionRow title={title}>
        <StatusBarConnectionLabel>link</StatusBarConnectionLabel>
        <StatusBarStatusDot $color={linkEnabled ? '#78dc82' : '#e05a5a'} />
      </StatusBarConnectionRow>
    )
  }

  if (type === 'dmx') {
    const { color, title } = dmxIndicatorState(dmxConnected, dmxConnectable)
    return (
      <StatusBarConnectionRow title={title}>
        <StatusBarConnectionLabel>dmx</StatusBarConnectionLabel>
        <StatusBarStatusDot $color={color} />
      </StatusBarConnectionRow>
    )
  }

  const isConnected = midiConnected.length > 0
  const title = isConnected ? 'midi connected' : 'No midi connection'

  return (
    <StatusBarConnectionRow title={title}>
      <StatusBarConnectionLabel>midi</StatusBarConnectionLabel>
      <StatusBarStatusDot $color={isConnected ? '#78dc82' : '#e05a5a'} />
    </StatusBarConnectionRow>
  )
}
