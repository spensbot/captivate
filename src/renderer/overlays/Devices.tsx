import styled from 'styled-components'
import { useControlSelector, useTypedSelector } from '../redux/store'
import { setConnectionsMenu } from '../redux/guiSlice'
import { useDispatch } from 'react-redux'
import { setDmxConnectable, setMidiConnectable } from '../redux/controlSlice'
import CloseIcon from '@mui/icons-material/Close'
import IconButton from '@mui/material/IconButton'
import { DmxDevice_t, MidiDevice_t, DeviceId } from '../../shared/connection'

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
          <Pane style={{ borderRight: '1px solid #777', paddingRight: '1rem' }}>
            <SubTitle>Dmx</SubTitle>
            {dmx.available.map((device) => (
              <DmxDevice
                key={device.id}
                device={device}
                connected={dmx.connected}
                connectable={connectable.dmx}
              />
            ))}
            {dmx.available.length === 0 && <NoneFound />}
          </Pane>
          <Pane style={{ paddingLeft: '1rem' }}>
            <SubTitle>Midi</SubTitle>
            {midi.available.map((device) => (
              <MidiDevice
                key={device.id}
                device={device}
                connected={midi.connected}
                connectable={connectable.midi}
              />
            ))}
            {midi.available.length === 0 && <NoneFound />}
          </Pane>
        </Row>
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
  align-items: center;
  justify-content: space-between;
`

const Pane = styled.div`
  flex: '1 0 0';
`

const Title = styled.div`
  font-size: 1.4rem;
`

const SubTitle = styled.div`
  font-size: 1.1rem;
  margin-bottom: 1rem;
`

interface Props2<T> {
  device: T
  connected: DeviceId[]
  connectable: DeviceId[]
}

function hasDevice(ids: DeviceId[], device: DmxDevice_t | MidiDevice_t) {
  return ids.find((id) => device.id === id) !== undefined
}

interface Status {
  isConnected: boolean
  isConnectable: boolean
}

function getStatus(
  device: DmxDevice_t | MidiDevice_t,
  connected: DeviceId[],
  connectable: DeviceId[]
): Status {
  return {
    isConnected: hasDevice(connected, device),
    isConnectable: hasDevice(connectable, device),
  }
}

function DmxDevice({ device, connected, connectable }: Props2<DmxDevice_t>) {
  const dispatch = useDispatch()
  const status = getStatus(device, connected, connectable)

  const onClick = () => {
    let newConnectable = [...connectable]
    if (status.isConnectable) {
      newConnectable = newConnectable.filter((c) => c !== device.id)
    } else {
      newConnectable.push(device.id)
    }
    dispatch(setDmxConnectable(newConnectable))
  }

  return (
    <DeviceRoot {...status} onClick={onClick}>
      {device.manufacturer ? `${device.manufacturer}` : device.id}
    </DeviceRoot>
  )
}

function MidiDevice({ device, connected, connectable }: Props2<MidiDevice_t>) {
  const dispatch = useDispatch()
  const status = getStatus(device, connected, connectable)

  const onClick = () => {
    let newConnectable = [...connectable]
    if (status.isConnectable) {
      newConnectable = newConnectable.filter((c) => c !== device.id)
    } else {
      newConnectable.push(device.id)
    }
    dispatch(setMidiConnectable(newConnectable))
  }

  return (
    <DeviceRoot {...status} onClick={onClick}>
      {device.id}
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
