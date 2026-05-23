import Tooltip from '@mui/material/Tooltip'
import styled from 'styled-components'
import { useRealtimeSelector } from '../redux/realtimeStore'
import { send_user_command } from '../ipcHandler'

export default function LinkButton({
  layout = 'default',
}: {
  /** Wider layout for Connections panel grid column. */
  layout?: 'default' | 'connections'
}) {
  const numPeers = useRealtimeSelector((state) => state.time.numPeers)
  const isEnabled = useRealtimeSelector((state) => state.time.isEnabled)

  const statusLine = !isEnabled
    ? 'Off'
    : numPeers === 0
    ? 'No peers yet'
    : numPeers === 1
    ? '1 peer'
    : `${numPeers} peers`

  const ariaLabel = !isEnabled
    ? 'Ableton Link: off. Click to enable wireless tempo sync.'
    : `Ableton Link: on, ${statusLine}. Click to disable.`

  return (
    <Tooltip
      placement="bottom-start"
      enterDelay={450}
      slotProps={{
        tooltip: {
          sx: {
            maxWidth: '19rem',
            py: 1,
            px: 1.25,
          },
        },
      }}
      title={
        <TooltipContent>
          <TooltipLead>
            <strong>Ableton Link</strong> shares tempo (BPM) with other Link-enabled apps on
            this computer and the same network — for example Ableton Live, DJ software, or
            another instance of this app.
          </TooltipLead>
          <TooltipP>
            <strong>Click</strong> this control to join or leave the Link session. The second
            line shows whether Link is off, or how many other Link peers are visible (not
            counting this app).
          </TooltipP>
          <TooltipP>
            When Link is on, use <strong>Start/stop sync</strong> in the Connections window
            (under MIDI) to follow other Link apps&apos; transport when supported.
          </TooltipP>
        </TooltipContent>
      }
    >
      <Root
        type="button"
        $active={isEnabled}
        $layout={layout}
        aria-pressed={isEnabled}
        aria-label={ariaLabel}
        onClick={() => {
          send_user_command({ type: 'SetLinkEnabled', isEnabled: !isEnabled })
        }}
      >
        <StatusDot $active={isEnabled} aria-hidden />
        <TextCol>
          <PrimaryRow>
            <WordAbleton>Ableton</WordAbleton>
            <WordLink>Link</WordLink>
          </PrimaryRow>
          <StatusText>{statusLine}</StatusText>
        </TextCol>
      </Root>
    </Tooltip>
  )
}

const TooltipContent = styled.div`
  font-size: 0.78rem;
  line-height: 1.4;
  text-align: left;
  color: inherit;
`

const TooltipLead = styled.div`
  margin: 0;
`

const TooltipP = styled.p`
  margin: 0.5rem 0 0;
`

const Root = styled.button<{ $active: boolean; $layout: 'default' | 'connections' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0;
  align-self: ${(p) => (p.$layout === 'connections' ? 'stretch' : 'flex-start')};
  width: ${(p) => (p.$layout === 'connections' ? '100%' : 'auto')};
  max-width: ${(p) => (p.$layout === 'connections' ? 'none' : '100%')};
  padding: 0.32rem 0.55rem 0.34rem 0.48rem;
  cursor: pointer;
  border-radius: 0.28rem;
  border: 1px solid ${(p) => (p.$active ? '#ffffff55' : '#ffffff28')};
  background: ${(p) => (p.$active ? '#2a4a66cc' : '#ffffff12')};
  color: ${(p) => (p.$active ? '#f0f6ff' : '#ffffffcc')};
  font: inherit;
  text-align: left;
  min-width: ${(p) => (p.$layout === 'connections' ? '0' : '4.6rem')};
  justify-content: ${(p) => (p.$layout === 'connections' ? 'center' : 'flex-start')};
  box-sizing: border-box;
  transition:
    border-color 0.12s ease,
    background 0.12s ease;

  &:hover {
    border-color: #ffffff66;
    background: ${(p) => (p.$active ? '#335578cc' : '#ffffff1c')};
  }

  &:focus-visible {
    outline: 2px solid #6fb0ff;
    outline-offset: 1px;
  }
`

const StatusDot = styled.span<{ $active: boolean }>`
  flex: 0 0 auto;
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 999rem;
  background: ${(p) => (p.$active ? '#5cdb95' : '#ffffff35')};
  box-shadow: ${(p) =>
    p.$active ? '0 0 0 1px #00000055, 0 0 6px #5cdb9588' : 'none'};
`

const TextCol = styled.span`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.05;
  min-width: 0;
`

const PrimaryRow = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.2rem 0.35rem;
`

const WordLink = styled.span`
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`

const WordAbleton = styled.span`
  font-size: 0.58rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  opacity: 0.72;
`

const StatusText = styled.span`
  font-size: 0.62rem;
  font-weight: 500;
  opacity: 0.88;
  margin-top: 0.12rem;
  white-space: nowrap;
`
