import styled from 'styled-components'
import { useControlSelector, useTypedSelector } from '../redux/store'
import { setConnectionsMenu } from '../redux/guiSlice'
import { useDispatch } from 'react-redux'
import {
  setDmxConnectable,
  setMidiConnectable,
  setOpenDmxRefreshRateHz,
  setUniverseCount,
  setDmxDeviceUniverse,
  setArtNetUniverseRoute,
} from '../redux/controlSlice'
import CloseIcon from '@mui/icons-material/Close'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { TextField } from '@mui/material'
import {
  DmxDevice_t,
  MidiDevice_t,
  ConnectionId,
} from '../../shared/connection'
import DmxTroubleShoot from './DmxTroubleshoot'
import Input from 'renderer/base/Input'
import DraggableNumber from 'renderer/base/DraggableNumber'

interface Props {}

export default function Devices({}: Props) {
  const dispatch = useDispatch()

  const deviceSetup = useControlSelector((state) => state.device)
  const connectable = deviceSetup.connectable
  const dmx = useTypedSelector((state) => state.gui.dmx)
  const midi = useTypedSelector((state) => state.gui.midi)

  const hasOpenDmx =
    dmx.available.find((device) => device.type === 'OpenDmxUsb') !== undefined

  return (
    <Root>
      <Modal>
        <Row style={{ paddingBottom: '0' }}>
          <Title>Connections</Title>
          <Tooltip title="Close connections menu">
            <IconButton onClick={() => dispatch(setConnectionsMenu(false))}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Row>
        <Row>
          <Pane>
            <SubTitle>Dmx</SubTitle>
            <SettingRow>
              <SettingLabel>Universe Count</SettingLabel>
              <Tooltip title="Total universes available for DMX and Art-Net routing">
                <div>
                  <DraggableNumber
                    value={deviceSetup.connectionSettings.universeCount}
                    min={1}
                    max={16}
                    onChange={(newVal) => dispatch(setUniverseCount(newVal))}
                  />
                </div>
              </Tooltip>
            </SettingRow>
            {dmx.available.map((device) => (
              <DmxDevice
                key={device.connectionId}
                device={device}
                connected={dmx.connected}
                connectable={connectable.dmx}
              />
            ))}
            {dmx.available.length === 0 && <NoneFound />}
            {hasOpenDmx && (
              <SettingRow>
                <SettingLabel>Open Dmx Refresh Rate</SettingLabel>
                <Tooltip title="Refresh rate used by Open DMX USB devices">
                  <div>
                    <DraggableNumber
                      value={deviceSetup.connectionSettings.openDmxRefreshRateHz}
                      min={5}
                      max={40}
                      onChange={(newVal) =>
                        dispatch(setOpenDmxRefreshRateHz(newVal))
                      }
                      suffix="hz"
                    />
                  </div>
                </Tooltip>
              </SettingRow>
            )}
            <ArtNetDevices />
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
  flex: 1 0 0;
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
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  margin-top: 1rem;
`

const SettingRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
`

const SettingLabel = styled.p`
  color: #aaa;
  font-size: 0.7rem;
  margin-right: 0.3rem;
`

const HelperText = styled.p`
  color: #aaa;
  font-size: 0.7rem;
  margin: 0 0 0.5rem;
`

function ArtNetDevices() {
  const dispatch = useDispatch()
  const universeCount = useControlSelector(
    (state) => state.device.connectionSettings.universeCount
  )
  const artNetIpByUniverse = useControlSelector(
    (state) => state.device.connectionSettings.artNetIpByUniverse
  )

  const universes = Array.from({ length: universeCount }, (_, i) => i + 1)

  return (
    <>
      <SubSubTitle>Art-Net Routing</SubSubTitle>
      <HelperText>
        Set destination IP per universe. Leave blank to disable that universe.
      </HelperText>
      {universes.map((universe) => (
        <ArtNetRouteRow key={universe}>
          <ArtNetUniverseTag>U{universe}</ArtNetUniverseTag>
          <Tooltip title={`Destination IP for Art-Net universe ${universe}`}>
            <div style={{ flex: '1 0 0' }}>
              <Input
                value={artNetIpByUniverse[universe] ?? ''}
                onChange={(newVal) =>
                  dispatch(setArtNetUniverseRoute({ universe, ip: newVal }))
                }
                placeholder="e.g. 192.168.1.50"
              />
            </div>
          </Tooltip>
        </ArtNetRouteRow>
      ))}
    </>
  )
}

const ArtNetRouteRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
`

const ArtNetUniverseTag = styled.div`
  min-width: 2.2rem;
  font-size: 0.75rem;
  color: ${(props) => props.theme.colors.text.secondary};
  text-align: right;
`

interface Props2<T> {
  device: T
  connected: ConnectionId[]
  connectable: ConnectionId[]
}

function hasDmxDevice(connectionIds: string[], device: DmxDevice_t) {
  return (
    connectionIds.find(
      (connectionId) => device.connectionId === connectionId
    ) !== undefined
  )
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
  const universeCount = useControlSelector(
    (state) => state.device.connectionSettings.universeCount
  )
  const assignedUniverse = useControlSelector(
    (state) =>
      state.device.connectionSettings.dmxUniverseByDevice[device.connectionId] ??
      1
  )

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
    <DeviceRow>
      <DeviceRoot
        {...status}
        onClick={onClick}
        title="Click to enable or disable this DMX adapter"
      >
        {device.name}
      </DeviceRoot>
      <Tooltip title="Universe this DMX adapter outputs">
        <TextField
          size="small"
          label="Universe"
          value={assignedUniverse.toString()}
          type="number"
          inputProps={{ min: 1, max: universeCount }}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            const universe = parseInt(e.target.value, 10)
            if (!Number.isNaN(universe)) {
              dispatch(
                setDmxDeviceUniverse({
                  connectionId: device.connectionId,
                  universe,
                })
              )
            }
          }}
        />
      </Tooltip>
    </DeviceRow>
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
    <DeviceRoot
      {...status}
      onClick={onClick}
      title="Click to enable or disable this MIDI device"
    >
      {device.name}
    </DeviceRoot>
  )
}

const DeviceRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
`

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
  flex: 1 1 auto;
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
