import styled from 'styled-components'
import { useControlSelector, useTypedSelector } from '../redux/store'
import { setConnectionsMenu } from '../redux/guiSlice'
import { useDispatch } from 'react-redux'
import {
  setDmxConnectable,
  setMidiConnectable,
  setMidiClockBpmEnabled,
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
import LabelledCheckbox from 'renderer/base/LabelledCheckbox'
import LinkButton from '../menu/LinkButton'
import StartStopSyncButton from '../menu/StartStopSyncButton'
import { useRealtimeSelector } from '../redux/realtimeStore'

interface Props {
  embedded?: boolean
}

export default function Devices({ embedded = false }: Props) {
  const dispatch = useDispatch()

  const deviceSetup = useControlSelector((state) => state.device)
  const connectable = deviceSetup.connectable
  const dmx = useTypedSelector((state) => state.gui.dmx)
  const midi = useTypedSelector((state) => state.gui.midi)

  const hasOpenDmx =
    dmx.available.find((device) => device.type === 'OpenDmxUsb') !== undefined

  const content = (
    <>
      {!embedded && (
        <Row style={{ paddingBottom: '0' }}>
          <Title>Connections</Title>
          <Tooltip title="Close connections menu">
            <IconButton onClick={() => dispatch(setConnectionsMenu(false))}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Row>
      )}
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
          <MidiClockBpmControl />
          <AbletonLinkConnections />
        </Pane>
      </Row>
      <DmxTroubleShoot />
    </>
  )

  if (embedded) {
    return <Modal $embedded={true}>{content}</Modal>
  }

  return (
    <Root>
      <Modal $embedded={false}>
        {content}
      </Modal>
    </Root>
  )
}

const Root = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #0007;
`

const Modal = styled.div<{ $embedded: boolean }>`
  background-color: ${(props) =>
    props.$embedded ? 'transparent' : props.theme.colors.bg.primary};
  width: ${(props) =>
    props.$embedded ? '100%' : 'min(68rem, calc(100vw - 3rem))'};
  max-height: ${(props) => (props.$embedded ? 'none' : 'calc(100vh - 3rem)')};
  overflow: ${(props) => (props.$embedded ? 'visible' : 'auto')};
  border: ${(props) => (props.$embedded ? 'none' : '1px solid #ffffff2d')};
  border-radius: ${(props) => (props.$embedded ? '0' : '0.5rem')};
  ${(props) => (props.$embedded ? 'margin: 0;' : 'margin: 1.5rem;')}
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

function MidiClockBpmControl() {
  const dispatch = useDispatch()
  const enabled = useControlSelector(
    (state) => state.device.connectionSettings.midiClockBpmEnabled === true
  )

  return (
    <>
      <SubSubTitle style={{ marginTop: '1.1rem' }}>Tempo from MIDI clock</SubSubTitle>
      <HelperText>
        When enabled, master BPM follows MIDI Timing Clock (24 pulses per quarter) from any
        enabled MIDI input above. Your DAW or hardware must send MIDI clock on that port.
        This turns off audio beat detection driving tempo (only one external source at a
        time).
      </HelperText>
      <Tooltip title="Requires an enabled MIDI device that transmits 0xF8 clock messages (common in Ableton Live, Reaper, hardware sequencers).">
        <MidiClockRow>
          <LabelledCheckbox
            label="Drive BPM from MIDI clock"
            checked={enabled}
            onChange={(next) => dispatch(setMidiClockBpmEnabled(next))}
          />
        </MidiClockRow>
      </Tooltip>
    </>
  )
}

const MidiClockRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.35rem;
`

const SyncTransportBlock = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-top: 0.35rem;
`

const SyncTransportInner = styled.div`
  display: flex;
  align-items: center;
`

const SyncTransportText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.08rem;
  min-width: 0;
`

const SyncTransportTitle = styled.div`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${(p) => p.theme.colors.text.primary};
`

const SyncTransportState = styled.div`
  font-size: 0.68rem;
  color: ${(p) => p.theme.colors.text.secondary};
`

function AbletonLinkConnections() {
  const linkEnabled = useRealtimeSelector((state) => state.time.isEnabled)
  const startStopSyncEnabled = useRealtimeSelector(
    (state) => state.time.isStartStopSyncEnabled
  )

  return (
    <>
      <SubSubTitle style={{ marginTop: '1.1rem' }}>Ableton Link</SubSubTitle>
      <HelperText>
        Sync tempo (BPM) with Ableton Live and other Link-enabled apps on this computer and
        the same network. This is separate from MIDI — it uses the network for timing, not
        a MIDI cable.
      </HelperText>
      <LinkButton />
      {!linkEnabled && (
        <HelperText>
          When Link is on, you can optionally sync master play/stop with compatible apps
          using the control below.
        </HelperText>
      )}
      {linkEnabled && (
        <SyncTransportBlock>
          <Tooltip
            title="When supported, play and stop follow other Link apps in the session. Click the icon to turn sync on or off."
            placement="right"
          >
            <SyncTransportInner>
              <StartStopSyncButton mode="menu" />
            </SyncTransportInner>
          </Tooltip>
          <SyncTransportText>
            <SyncTransportTitle>Start/stop sync</SyncTransportTitle>
            <SyncTransportState>
              {startStopSyncEnabled ? 'On — follows Link transport' : 'Off'}
            </SyncTransportState>
          </SyncTransportText>
        </SyncTransportBlock>
      )}
    </>
  )
}

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
