import type { ReactNode } from 'react'
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
import ToggleSwitch from 'renderer/base/ToggleSwitch'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
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
      <ConnectionsGrid>
        <ConnectionSection>
          <SectionHeader
            title="DMX"
            tooltip={DMX_SECTION_TOOLTIP}
            tooltipAriaLabel="About DMX output"
          />
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
        </ConnectionSection>
        <ConnectionSection>
          <SectionHeader
            title="Art-Net"
            tooltip={ART_NET_SECTION_TOOLTIP}
            tooltipAriaLabel="About Art-Net routing"
          />
          <ArtNetDevices />
        </ConnectionSection>
        <ConnectionSection>
          <SectionHeader
            title="MIDI"
            tooltip={MIDI_SECTION_TOOLTIP}
            tooltipAriaLabel="About MIDI inputs"
          />
          {midi.available.map((device) => (
            <MidiDevice
              key={device.name}
              device={device}
              connected={midi.connected}
              connectable={connectable.midi}
            />
          ))}
          {midi.available.length === 0 && <NoneFound />}
          <MidiClockBpmControl midiConnected={midi.connected.length > 0} />
        </ConnectionSection>
        <ConnectionSection>
          <SectionHeader
            title="Ableton Link"
            tooltip={ABLETON_LINK_SECTION_TOOLTIP}
            tooltipAriaLabel="About Ableton Link"
          />
          <AbletonLinkConnections />
        </ConnectionSection>
      </ConnectionsGrid>
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
  padding: 1rem 1rem 0;
  align-items: center;
  justify-content: space-between;
`

const ConnectionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  padding: 1rem;
  /* Stretch items in each row so left/right neighbors share the same height;
     rows remain independent (top/bottom can differ). */
  align-items: stretch;
  box-sizing: border-box;

  @media (max-width: 52rem) {
    grid-template-columns: 1fr;
  }
`

const ConnectionSection = styled.section`
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.45rem;
  padding: 0.9rem 1rem 1rem;
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  box-sizing: border-box;
`

const SectionHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin: 0 0 0.5rem;
  min-height: 1.75rem;
`

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: ${(p) => p.theme.colors.text.primary};
  letter-spacing: 0.02em;
`

const TOOLTIP_BODY_SX = {
  maxWidth: '22rem',
  py: 1,
  px: 1.15,
  lineHeight: 1.45,
} as const

function SectionHeader({
  title,
  tooltip,
  tooltipAriaLabel,
}: {
  title: string
  tooltip?: ReactNode
  tooltipAriaLabel?: string
}) {
  return (
    <SectionHeaderRow>
      <SectionTitle>{title}</SectionTitle>
      {tooltip !== undefined && (
        <Tooltip
          title={tooltip}
          placement="top"
          enterDelay={350}
          slotProps={{
            tooltip: { sx: TOOLTIP_BODY_SX },
          }}
        >
          <IconButton
            size="small"
            aria-label={tooltipAriaLabel ?? `About ${title}`}
            onMouseDown={(e) => e.stopPropagation()}
            sx={{
              padding: '0.12rem',
              color: 'text.secondary',
              '&:hover': { color: 'text.primary' },
            }}
          >
            <InfoOutlined sx={{ fontSize: '1rem' }} />
          </IconButton>
        </Tooltip>
      )}
    </SectionHeaderRow>
  )
}

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

const Title = styled.div`
  font-size: 1.4rem;
`

const DMX_SECTION_TOOLTIP = (
  <>
    USB DMX adapters detected on this computer appear here. Click a device to enable or
    disable it for DMX output.
    <br />
    <br />
    Universe count sets how many universes are available for DMX and Art-Net together.
    Assign each adapter the universe it should drive. If you use Open DMX USB hardware, a
    refresh rate control appears when that device is present.
  </>
)

const MIDI_SECTION_TOOLTIP = (
  <>
    MIDI input ports appear here. Click a device to enable or disable it for use in
    Captivate.
    <br />
    <br />
    When at least one input is enabled, you can optionally drive master BPM from MIDI timing
    clock using the toggle below (see the info icon there for details).
  </>
)

const ART_NET_SECTION_TOOLTIP = (
  <>
    Set destination IP per universe. Leave blank to disable output on that universe.
  </>
)

const ABLETON_LINK_SECTION_TOOLTIP = (
  <>
    Sync tempo (BPM) with Ableton Live and other Link-enabled apps on this computer and the
    same network. This is separate from MIDI — it uses the network for timing, not a MIDI
    cable.
    <br />
    <br />
    When Link is enabled, you can optionally sync master play/stop with compatible apps
    using the start/stop control in this section (when supported by the session).
  </>
)

const MIDI_CLOCK_TOOLTIP = (
  <>
    When enabled, master BPM follows MIDI timing clock (24 pulses per quarter note) from any
    enabled MIDI input above. Your DAW or hardware must send MIDI clock on that port. This
    disables audio beat detection as the tempo source (only one external BPM source at a
    time).
    <br />
    <br />
    Requires a device that transmits 0xF8 clock messages (common in Ableton Live, Reaper,
    and hardware sequencers).
  </>
)

function MidiClockBpmControl({ midiConnected }: { midiConnected: boolean }) {
  const dispatch = useDispatch()
  const enabled = useControlSelector(
    (state) => state.device.connectionSettings.midiClockBpmEnabled === true
  )

  if (!midiConnected) {
    return null
  }

  return (
    <MidiClockBlock>
      <MidiClockRow>
        <MidiClockLabelGroup>
          <MidiClockLabel>Drive BPM from MIDI clock</MidiClockLabel>
          <Tooltip
            title={MIDI_CLOCK_TOOLTIP}
            placement="right-start"
            enterDelay={350}
            slotProps={{
              tooltip: {
                sx: TOOLTIP_BODY_SX,
              },
            }}
          >
            <IconButton
              size="small"
              aria-label="About MIDI clock tempo"
              onMouseDown={(e) => e.stopPropagation()}
              sx={{
                padding: '0.12rem',
                marginLeft: '0.08rem',
                color: 'text.secondary',
                '&:hover': { color: 'text.primary' },
              }}
            >
              <InfoOutlined sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
        </MidiClockLabelGroup>
        <ToggleSwitch
          checked={enabled}
          onChange={(next) => dispatch(setMidiClockBpmEnabled(next))}
          aria-label="Drive BPM from MIDI clock"
        />
      </MidiClockRow>
    </MidiClockBlock>
  )
}

const MidiClockBlock = styled.div`
  margin-top: 1.1rem;
`

const MidiClockRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  margin-bottom: 0.35rem;
`

const MidiClockLabelGroup = styled.div`
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1 1 auto;
`

const MidiClockLabel = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${(p) => p.theme.colors.text.primary};
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
      <LinkButton />
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
