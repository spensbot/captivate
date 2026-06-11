import styled from 'styled-components'
import { useDispatch } from 'react-redux'
import { useRealtimeSelector } from '../redux/realtimeStore'
import { setLinkStartStopSyncEnabled } from '../redux/controlSlice'
import { send_user_command } from '../ipcHandler'

interface Props {
  /**
   * `toolbar`: previous status-bar behaviour (spacer when Link is off).
   * `menu`: used in Connections — render nothing when Link is off; compact layout when on.
   */
  mode?: 'toolbar' | 'menu'
}

export default function StartStopSyncButton({ mode = 'toolbar' }: Props) {
  const dispatch = useDispatch()
  const linkEnabled = useRealtimeSelector((state) => state.time.isEnabled)
  const startStopSyncEnabled = useRealtimeSelector(
    (state) => state.time.isStartStopSyncEnabled
  )

  const toggleStartStopSync = () => {
    const next = !startStopSyncEnabled
    dispatch(setLinkStartStopSyncEnabled(next))
    send_user_command({
      type: 'EnableStartStopSync',
      isEnabled: next,
    })
  }

  const color = startStopSyncEnabled ? '#fff7' : '#fff3'
  const compact = mode === 'menu'

  if (!linkEnabled) {
    return mode === 'menu' ? null : <PlaceHolder />
  }

  return (
    <Root
      $compact={compact}
      role="button"
      tabIndex={0}
      title={
        startStopSyncEnabled
          ? 'Start/stop sync is on — click to turn off'
          : 'Click to sync play/stop with other Link apps when supported'
      }
      onClick={toggleStartStopSync}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          toggleStartStopSync()
        }
      }}
    >
      <Line $compact={compact} color={color} />
      <CircleBg color={color} />
      <Breaker color={color} />
      <Circle enabled={startStopSyncEnabled} color={color} />
    </Root>
  )
}

const color = '#fff5'

const Root = styled.div<{ $compact: boolean }>`
  position: relative;
  cursor: pointer;
  width: ${(p) => (p.$compact ? '2.5rem' : 'auto')};
  height: ${(p) => (p.$compact ? '1.65rem' : 'auto')};
  flex: 0 0 auto;
  :hover {
    opacity: 1;
  }
`

const PlaceHolder = styled.div`
  width: 1rem;
`

const Line = styled.div<{ $compact?: boolean }>`
  background-color: ${color};
  height: 0.1rem;
  width: 2.5rem;
  margin: ${(p) => (p.$compact ? '0.28rem 0' : '1rem 0')};
`

const centerIt = `
position: absolute;
top: 50%;
left: 50%;
transform: translate(-50%, -50%);`

const CircleBg = styled.div`
  margin: auto;
  border: 2px solid ${color};
  background-color: ${(props) => props.theme.colors.bg.primary};
  border-radius: 10rem;
  height: 1.2rem;
  width: 1.2rem;
  cursor: pointer;
  ${centerIt}
`
const Breaker = styled.div`
  height: 100%;
  width: 0.7rem;
  background-color: ${(props) => props.theme.colors.bg.primary};
  ${centerIt}
`
const Circle = styled.div<{ enabled: boolean }>`
  border-radius: 10rem;
  height: 0.9rem;
  width: 0.9rem;
  background-color: #fffa;
  /* background-color: #3d5a; */
  opacity: ${(props) => (props.enabled ? 1 : 0)};
  cursor: pointer;
  ${centerIt}
`
