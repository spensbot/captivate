import Counter2 from './Counter2'
import ConnectionStatus from './ConnectionStatus'
import styled from 'styled-components'
import UndoRedo from 'renderer/controls/UndoRedo'
import SettingsEthernetIcon from '@mui/icons-material/SettingsEthernet'
import IconButton from '@mui/material/IconButton'
import PianoIcon from '@mui/icons-material/Piano'
import { useDeviceSelector, useDmxSelector, useTypedSelector } from '../redux/store'
import { useDispatch } from 'react-redux'
import { midiSetIsEditing } from '../redux/controlSlice'
import { setConnectionsMenu } from '../redux/guiSlice'
import { setStageUnits } from '../redux/dmxSlice'
import TapTempo from './TapTempo'
import StartStopButton from './StartStopButton'
import SaveLoad from './SaveLoad'
import LinkButton from './LinkButton'
import Bpm from './Bpm'
import StartStopSyncButton from './StartStopSyncButton'

export default function StatusBar() {
  const isEditing = useDeviceSelector((state) => state.isEditing)
  const connectionMenu = useTypedSelector((state) => state.gui.connectionMenu)
  const dispatch = useDispatch()
  const midiConnected = useTypedSelector(
    (state) => state.gui.midi.connected.length > 0
  )
  const stageUnit = useDmxSelector((state) => state.stage.unit)

  return (
    <Root>
      <StartStopButton />
      {/* <Sp /> */}
      <StartStopSyncButton />
      {/* <Sp /> */}
      <LinkButton />
      <Sp />
      <TapTempo />
      <Sp />
      <Bpm />
      <Sp />
      <Counter2 />
      <UndoRedo />
      <div style={{ flex: '1 0 0' }} />
      {midiConnected && (
        <IconButton onClick={() => dispatch(midiSetIsEditing(!isEditing))}>
          <PianoIcon />
        </IconButton>
      )}
      <UnitsButton
        type="button"
        title="Stage unit preset (used by XYZ mapping and 3D stage scale)"
        onClick={() => dispatch(setStageUnits(stageUnit === 'ft' ? 'm' : 'ft'))}
      >
        {stageUnit.toUpperCase()}
      </UnitsButton>
      <IconButton onClick={() => dispatch(setConnectionsMenu(!connectionMenu))}>
        <SettingsEthernetIcon />
      </IconButton>
      <SaveLoad />
      <Connections>
        <ConnectionStatus type={'midi'} />
        <ConnectionStatus type={'dmx'} />
      </Connections>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  justify-content: right;
  align-items: center;
  font-size: 1.2rem;
  padding: 0.2rem 1rem 0.2rem 0.5rem;
  border-bottom: 1px solid ${(props) => props.theme.colors.divider};
  background-color: ${(props) => props.theme.colors.bg.primary};
`

const Connections = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
`

const Sp = styled.div`
  width: 0.8rem;
`

const UnitsButton = styled.button`
  border: 1px solid #ffffff44;
  background: #0007;
  color: #d6def1;
  border-radius: 0.3rem;
  font-size: 0.68rem;
  letter-spacing: 0.03em;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  margin-right: 0.35rem;
`
