import styled from 'styled-components'
import SettingsEthernetIcon from '@mui/icons-material/SettingsEthernet'
import IconButton from '@mui/material/IconButton'
import { useDispatch } from 'react-redux'
import { setConnectionsMenu } from '../renderer/redux/guiSlice'
import { useTypedSelector } from '../renderer/redux/store'
import Counter2 from '../renderer/menu/Counter2'
import TapTempo from '../renderer/menu/TapTempo'
import StartStopButton from '../renderer/menu/StartStopButton'
import Bpm from '../renderer/menu/Bpm'
import ConnectionStatus from '../renderer/menu/ConnectionStatus'
import RemoteAudioPanel from './RemoteAudioPanel'

export default function RemoteStatusBar() {
  const dispatch = useDispatch()
  const connectionMenu = useTypedSelector((state) => state.gui.connectionMenu)

  return (
    <Root>
      <StartStopButton />
      <Sp />
      <TapTempo />
      <Sp />
      <Bpm />
      <Sp />
      <Counter2 />
      <div style={{ flex: '1 0 0' }} />
      <RemoteAudioPanel />
      <IconButton
        title="Connections (DMX, MIDI, Link)"
        onClick={() => dispatch(setConnectionsMenu(!connectionMenu))}
        size="small"
        sx={{ color: 'text.secondary' }}
      >
        <SettingsEthernetIcon fontSize="small" />
      </IconButton>
      <Connections>
        <ConnectionStatus type="midi" />
        <ConnectionStatus type="dmx" />
        <ConnectionStatus type="link" />
      </Connections>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  justify-content: right;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.2rem;
  padding: 0.35rem 0.5rem;
  border-bottom: 1px solid ${(p) => p.theme.colors.divider};
  background: ${(p) => p.theme.colors.bg.darker};
`

const Sp = styled.div`
  width: 0.35rem;
`

const Connections = styled.div`
  display: flex;
  gap: 0.25rem;
  align-items: center;
`
