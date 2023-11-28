import styled from 'styled-components'
import { useControlSelector, useTypedSelector } from '../redux/store'
import { setConnectionsMenu } from '../redux/guiSlice'
import { useDispatch } from 'react-redux'
import {
  setDmxConnectable,
  setMidiConnectable,
  setArtNetConnectable,
} from '../redux/controlSlice'
import CloseIcon from '@mui/icons-material/Close'
import IconButton from '@mui/material/IconButton'
import {
  DmxDevice_t,
  MidiDevice_t,
  ConnectionId,
} from '../../shared/connection'
import DmxTroubleShoot from './DmxTroubleshoot'
import Input from 'renderer/base/Input'

interface Props {}

export default function Devices({}: Props) {
  const dispatch = useDispatch()

  const connectable = useControlSelector((state) => state.device.connectable)
  const dmx = useTypedSelector((state) => state.gui.dmx)
  const midi = useTypedSelector((state) => state.gui.midi)

  return (
    <Root>
      <Modal>
        <Row style={{ paddingBottom: '0' }}>
          <Title>Connections</Title>
          <IconButton onClick={() => dispatch(setConnectionsMenu(false))}>
            <CloseIcon />
          </IconButton>
        </Row>
        <Row>
          <Pane>
            <SubTitle>Dmx</SubTitle>
            {dmx.available.map((device) => (
              <DmxDevice
                key={device.name}
                device={device}
                connected={dmx.connected}
                connectable={connectable.dmx}
              />
            ))}
            {dmx.available.length === 0 && <NoneFound />}
            <SubSubTitle>Art-Net</SubSubTitle>
            <Input
              value={connectable.artNet[0] ?? ''}
              onChange={(newVal) => dispatch(setArtNetConnectable([newVal]))}
            />
          </Pane>
          <Divider />
          <Pane>
            <SubTitle>Midi</SubTitle>
            {midi.available.map((device) => (
              <MidiDevice
                key={device.name}
                device={device}
                connected={midi.connected}
                connectable={connectable.midi}
              />
            ))}
            {midi.available.length === 0 && <NoneFound />}
          </Pane>
        </Row>
        <DmxTroubleShoot />
      </Modal>
    </Root>
  )
}

const Root = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  background-color: #0007;
`

const Modal = styled.div`
  background-color: ${(props) => props.theme.colors.bg.primary};
  margin: 3rem;
`

const Row = styled.div`
  display: flex;
  padding: 1rem;
  align-items: stretch;
  justify-content: space-between;
`

const Pane = styled.div`
  flex: '1 0 0';
  height: 100%;
`

const Divider = styled.div`
  width: 1px;
  background-color: ${(props) => props.theme.colors.divider};
  margin: 0 1rem;
`

const Title = styled.div`
  font-size: 1.4rem;
`

const SubTitle = styled.div`
  font-size: 1.1rem;
  margin-bottom: 1rem;
`

const SubSubTitle = styled.div`
  font-size: 0.9;
  margin-bottom: 0.5rem;
  margin-top: 1rem;
`

interface Props2<T> {
  device: T
  connected: ConnectionId[]
  connectable: ConnectionId[]
}

function hasDmxDevice(paths: string[], device: DmxDevice_t) {
  return paths.find((path) => device.path === path) !== undefined
}

function hasMidiDevice(
  ids: ConnectionId[],
  device: DmxDevice_t | MidiDevice_t
) {
  return ids.find((id) => device.connectionId === id) !== undefined
}

interface Status {
  isConnected: boolean
  isConnectable: boolean
}

function getMidiStatus(
  device: MidiDevice_t,
  connected: ConnectionId[],
  connectable: ConnectionId[]
): Status {
  return {
    isConnected: hasMidiDevice(connected, device),
    isConnectable: hasMidiDevice(connectable, device),
  }
}

function getDmxStatus(
  device: DmxDevice_t,
  connected: ConnectionId[],
  connectable: ConnectionId[]
): Status {
  return {
    isConnected: hasDmxDevice(connected, device),
    isConnectable: hasDmxDevice(connectable, device),
  }
}

function DmxDevice({ device, connected, connectable }: Props2<DmxDevice_t>) {
  const dispatch = useDispatch()
  const status = getDmxStatus(device, connected, connectable)

  const onClick = () => {
    let connectableSet = new Set(connectable)
    if (status.isConnectable) {
      connectableSet.delete(device.connectionId)
    } else {
      connectableSet.add(device.connectionId)
    }
    dispatch(setDmxConnectable(Array.from(connectableSet)))
  }

  return (
    <DeviceRoot {...status} onClick={onClick}>
      {device.name}
    </DeviceRoot>
  )
}

function MidiDevice({ device, connected, connectable }: Props2<MidiDevice_t>) {
  const dispatch = useDispatch()
  const status = getMidiStatus(device, connected, connectable)

  const onClick = () => {
    let connectableSet = new Set(connectable)
    if (status.isConnectable) {
      connectableSet.delete(device.connectionId)
    } else {
      connectableSet.add(device.connectionId)
    }
    dispatch(setMidiConnectable(Array.from(connectableSet)))
  }

  return (
    <DeviceRoot {...status} onClick={onClick}>
      {device.name}
    </DeviceRoot>
  )
}

const DeviceRoot = styled.div<Status>`
  padding: 0.5rem;
  cursor: pointer;
  color: ${(props) =>
    props.isConnected
      ? props.theme.colors.text.primary
      : props.theme.colors.text.secondary};
  border: ${(props) =>
    props.isConnectable
      ? `1px solid ${props.theme.colors.divider}`
      : `1px solid #0000`};
  :hover {
    text-decoration: underline;
  }
`

function NoneFound() {
  return <None>None Found</None>
}

const None = styled.div`
  padding: 0.5rem;
  color: ${(props) => props.theme.colors.text.secondary};
`
