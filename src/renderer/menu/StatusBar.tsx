import Counter2 from './Counter2'
import ConnectionStatus from './ConnectionStatus'
import styled from 'styled-components'
import UndoRedo from 'renderer/controls/UndoRedo'
import SettingsEthernetIcon from '@mui/icons-material/SettingsEthernet'
import PianoIcon from '@mui/icons-material/Piano'
import IconButton from '@mui/material/IconButton'
import { useDeviceSelector, useTypedSelector } from '../redux/store'
import { useDispatch } from 'react-redux'
import { midiSetIsEditing, midiSetKeyboardLearnMode } from '../redux/controlSlice'
import { setConnectionsMenu } from '../redux/guiSlice'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import TapTempo from './TapTempo'
import StartStopButton from './StartStopButton'
import SaveLoad from './SaveLoad'
import Bpm from './Bpm'
import AudioInputMenu from './AudioInputMenu'
import { send_open_page_window } from '../ipcHandler'
import KeyboardShortcutMenuButton from '../overlays/KeyboardShortcutEditorDialog'

export default function StatusBar() {
  const isEditing = useDeviceSelector((state) => state.isEditing)
  const connectionMenu = useTypedSelector((state) => state.gui.connectionMenu)
  const activePage = useTypedSelector((state) => state.gui.activePage)
  const dispatch = useDispatch()
  const midiConnected = useTypedSelector(
    (state) => state.gui.midi.connected.length > 0
  )
  const handleMidiAssignClick = () => {
    if (!midiConnected) {
      dispatch(setConnectionsMenu(true))
      return
    }
    dispatch(midiSetKeyboardLearnMode(false))
    dispatch(midiSetIsEditing(!isEditing))
  }
  const canPopOutActivePage = activePage !== 'Atmospherics'

  return (
    <Root>
      <StartStopButton />
      <Sp />
      <TapTempo />
      <Sp />
      <Bpm />
      <Sp />
      <Counter2 />
      <UndoRedo />
      <div style={{ flex: '1 0 0' }} />
      {canPopOutActivePage && (
        <IconButton
          title={`Open ${activePage} in a detached window`}
          onClick={() => send_open_page_window(activePage)}
          size="small"
          sx={{ color: 'text.secondary' }}
        >
          <OpenInNewIcon fontSize="small" />
        </IconButton>
      )}
      <KeyboardShortcutMenuButton />
      <IconButton
        title={
          midiConnected
            ? isEditing
              ? 'Exit MIDI mapping mode'
              : 'Enter MIDI mapping mode'
            : 'No MIDI device connected. Open Connections to set up MIDI.'
        }
        onClick={handleMidiAssignClick}
        size="small"
        sx={{
          color: isEditing ? 'success.main' : 'text.secondary',
          opacity: midiConnected ? 1 : 0.55,
        }}
      >
        <PianoIcon fontSize="small" />
      </IconButton>
      <AudioInputMenu />
      <IconButton
        title="Open connection settings"
        onClick={() => dispatch(setConnectionsMenu(!connectionMenu))}
        size="small"
        sx={{ color: 'text.secondary' }}
      >
        <SettingsEthernetIcon fontSize="small" />
      </IconButton>
      <SaveLoad />
      <Connections>
        <ConnectionStatus type={'midi'} />
        <ConnectionStatus type={'dmx'} />
        <ConnectionStatus type={'link'} />
      </Connections>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  justify-content: right;
  align-items: center;
  flex: 0 0 3.2rem;
  width: 100%;
  height: 3.2rem;
  min-height: 3.2rem;
  max-height: 3.2rem;
  min-width: 0;
  font-size: 1.2rem;
  padding: 0 1rem 0 0.5rem;
  box-sizing: border-box;
  border-bottom: 1px solid ${(props) => props.theme.colors.divider};
  background-color: ${(props) => props.theme.colors.bg.primary};
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
`

const Connections = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
`

const Sp = styled.div`
  width: 0.8rem;
`
