import styled from 'styled-components'
import SettingsEthernetIcon from '@mui/icons-material/SettingsEthernet'
import IconButton from '@mui/material/IconButton'
import { useDispatch } from 'react-redux'
import { setConnectionsMenu } from '../renderer/redux/guiSlice'
import { useTypedSelector } from '../renderer/redux/store'
import TapTempo from '../renderer/menu/TapTempo'
import StartStopButton from '../renderer/menu/StartStopButton'
import Bpm from '../renderer/menu/Bpm'
import Counter2 from '../renderer/menu/Counter2'
import ConnectionStatus from '../renderer/menu/ConnectionStatus'
import AudioInputMenu from '../renderer/menu/AudioInputMenu'
import RemoteUiModeToggle from './RemoteUiModeToggle'
import RemoteMobileTransportControls from './RemoteMobileTransportControls'
import { useRemoteUiMode } from './RemoteUiModeContext'

export default function RemoteStatusBar() {
  const dispatch = useDispatch()
  const connectionMenu = useTypedSelector((state) => state.gui.connectionMenu)
  const { isMobile } = useRemoteUiMode()

  if (isMobile) {
    return (
      <MobileRoot>
        <RemoteMobileTransportControls />
        <MobileSecondaryRow>
          <AudioInputMenu remoteClient />
          <RemoteUiModeToggle />
          <IconButton
            title="Connections (DMX, MIDI, Link)"
            onClick={() => dispatch(setConnectionsMenu(!connectionMenu))}
            size="medium"
            sx={{ color: 'text.primary' }}
          >
            <SettingsEthernetIcon />
          </IconButton>
          <Connections>
            <ConnectionStatus type="midi" />
            <ConnectionStatus type="dmx" />
            <ConnectionStatus type="link" />
          </Connections>
        </MobileSecondaryRow>
      </MobileRoot>
    )
  }

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
      <AudioInputMenu remoteClient />
      <RemoteUiModeToggle />
      <IconButton
        title="Connections (DMX, MIDI, Link)"
        onClick={() => dispatch(setConnectionsMenu(!connectionMenu))}
        size="small"
        sx={{ color: 'text.primary' }}
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

const MobileRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.55rem 0.65rem;
  border-bottom: 1px solid ${(p) => p.theme.colors.divider};
  background: ${(p) => p.theme.colors.bg.darker};
  flex-shrink: 0;
`

const MobileSecondaryRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.35rem;
`

const Sp = styled.div`
  width: 0.35rem;
`

const Connections = styled.div`
  display: flex;
  gap: 0.35rem;
  align-items: center;
`
