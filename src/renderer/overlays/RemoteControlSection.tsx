import { useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { TextField, IconButton, Tooltip } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import ToggleSwitch from '../base/ToggleSwitch'
import SectionHelpButton, {
  HelpIntro,
  HelpList,
  HelpTitle,
} from '../base/SectionHelpPopover'
import {
  remoteControlApplySettings,
  remoteControlGetStatus,
  remoteControlRegeneratePin,
} from '../ipcHandler'
import type { RemoteControlRuntimeStatus } from '../../shared/remoteControl'
import { REMOTE_CONTROL_DEFAULT_PORT } from '../../shared/remoteControl'

export default function RemoteControlSection() {
  const [status, setStatus] = useState<RemoteControlRuntimeStatus | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [port, setPort] = useState(String(REMOTE_CONTROL_DEFAULT_PORT))
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const enabledRef = useRef(false)

  const refresh = useCallback(async () => {
    const s = await remoteControlGetStatus()
    setStatus(s)
    setEnabled(s.enabled)
    enabledRef.current = s.enabled
    setPort(String(s.port))
    setPin(s.pin)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (status?.running !== true) {
      return
    }
    const poll = window.setInterval(() => {
      void refresh()
    }, 1500)
    return () => clearInterval(poll)
  }, [status?.running, refresh])

  const apply = async (nextEnabled: boolean) => {
    enabledRef.current = nextEnabled
    setBusy(true)
    setNote('')
    try {
      const s = await remoteControlApplySettings({
        enabled: nextEnabled,
        port: Number(port),
        pin,
      })
      setStatus(s)
      setEnabled(s.enabled)
      enabledRef.current = s.enabled
      setPort(String(s.port))
      setPin(s.pin)
      if (s.lastError) {
        setNote(s.lastError)
      } else if (s.running) {
        setNote('')
      } else if (nextEnabled) {
        setNote('Could not start remote server. See message above or build logs.')
      } else {
        setNote('')
      }
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const applyIfEnabled = () => {
    if (!enabledRef.current) {
      return
    }
    void apply(true)
  }

  const regenPin = async () => {
    setBusy(true)
    setNote('')
    try {
      const res = await remoteControlRegeneratePin()
      setPin(res.pin)
      setStatus(res.status)
      setNote('PIN changed — reconnect remote browsers.')
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const running = status?.running === true

  return (
    <Section>
      <SectionHeaderRow>
        <SectionTitle>Remote control</SectionTitle>
        <SectionHelpButton ariaLabel="How to use remote control">
          <HelpTitle>How to use remote control</HelpTitle>
          <HelpIntro>
            Run a slim web interface on your local network so phones, tablets, or
            another laptop can operate the show. This computer keeps all hardware,
            visualizers, and editing tools.
          </HelpIntro>
          <HelpList>
            <li>
              Turn <strong>Enable</strong> on to start the server. Devices on the
              same Wi‑Fi or LAN open the listed URL in a browser (Chrome
              recommended), enter the PIN, then use scenes, the DMX mixer, and
              connections. Audio capture always runs on this computer, not on the
              remote device.
            </li>
            <li>
              Set <strong>Port</strong> to the TCP port for the web server (default{' '}
              {REMOTE_CONTROL_DEFAULT_PORT}). Your firewall may ask to allow
              inbound connections the first time — only use on trusted networks.
            </li>
            <li>
              Set or regenerate the <strong>PIN</strong> if it was shared too
              widely. Connected browsers appear below when the server is running.
            </li>
            <li>
              Not available remotely: visualizer, fixture editor, Laser ILDA,
              Lighting 3D, wLED, MIDI mapping learn mode, keyboard shortcuts, and
              project save/load.
            </li>
          </HelpList>
        </SectionHelpButton>
      </SectionHeaderRow>

      <ControlGrid $expanded={enabled}>
        <Col>
          <ColLabel>Enable</ColLabel>
          <ToggleWrap>
            <ToggleSwitch
              checked={enabled}
              disabled={busy}
              onChange={(v) => {
                enabledRef.current = v
                setEnabled(v)
                void apply(v)
              }}
            />
          </ToggleWrap>
        </Col>
        {enabled ? (
          <>
            <Col>
              <ColLabel>Port</ColLabel>
              <CompactField
                size="small"
                value={port}
                disabled={busy}
                onChange={(e) => setPort(e.target.value)}
                onBlur={applyIfEnabled}
                inputProps={{ inputMode: 'numeric' }}
                fullWidth
              />
            </Col>
            <Col>
              <ColLabel>PIN</ColLabel>
              <PinRow>
                <CompactField
                  size="small"
                  value={pin}
                  disabled={busy}
                  onChange={(e) => setPin(e.target.value)}
                  onBlur={applyIfEnabled}
                  fullWidth
                />
                <Tooltip title="Generate a new PIN">
                  <span>
                    <IconButton
                      size="small"
                      disabled={busy}
                      aria-label="New PIN"
                      onClick={() => void regenPin()}
                    >
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </PinRow>
            </Col>
          </>
        ) : null}
      </ControlGrid>

      {running && status.urls.length > 0 ? (
        <StatusRow>
          {status.urls.map((url) => (
            <StatusUrl key={url} href={url} target="_blank" rel="noreferrer">
              {url}
            </StatusUrl>
          ))}
          <StatusMeta>
            {status.clientCount} connected
          </StatusMeta>
        </StatusRow>
      ) : null}
      {note.length > 0 ? <NoteLine>{note}</NoteLine> : null}
    </Section>
  )
}

const Section = styled.section`
  grid-column: 1 / -1;
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.45rem;
  padding: 0.65rem 0.85rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
  box-sizing: border-box;
`

const SectionHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  min-height: 1.5rem;
`

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: ${(p) => p.theme.colors.text.primary};
  letter-spacing: 0.02em;
`

const ControlGrid = styled.div<{ $expanded: boolean }>`
  display: grid;
  grid-template-columns: ${(p) =>
    p.$expanded ? '1fr 1fr 1fr' : '1fr'};
  gap: 0.5rem 0.75rem;
  align-items: end;
`

const Col = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
`

const ColLabel = styled.span`
  font-size: 0.68rem;
  color: ${(p) => p.theme.colors.text.secondary};
  line-height: 1.2;
`

const ToggleWrap = styled.div`
  display: flex;
  align-items: center;
  min-height: 2rem;
`

const CompactField = styled(TextField)`
  & .MuiInputBase-root {
    font-size: 0.78rem;
  }
  & .MuiInputBase-input {
    padding: 0.35rem 0.5rem;
  }
`

const PinRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.15rem;
  min-width: 0;
`

const StatusRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.65rem;
  padding-top: 0.15rem;
`

const StatusUrl = styled.a`
  font-size: 0.7rem;
  color: #8ac4f0;
  word-break: break-all;
`

const StatusMeta = styled.span`
  font-size: 0.66rem;
  color: ${(p) => p.theme.colors.text.secondary};
`

const NoteLine = styled.div`
  font-size: 0.66rem;
  color: ${(p) => p.theme.colors.text.secondary};
  line-height: 1.3;
`
