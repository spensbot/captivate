import { useEffect, useMemo, useState } from 'react'
import styled, { css, keyframes } from 'styled-components'
import { useDispatch } from 'react-redux'
import { useTypedSelector } from 'renderer/redux/store'
import { useRealtimeSelector } from 'renderer/redux/realtimeStore'
import {
  clearStatusMessages,
  setStatusLogOpen,
  type StatusMessage,
} from 'renderer/redux/guiSlice'
import AppModal from 'renderer/overlays/AppModal'

interface DisplayMessage {
  id: string
  level: 'info' | 'warn' | 'error'
  message: string
  source?: string
  ts?: number
}

export default function BottomStatus() {
  const dispatch = useDispatch()
  const isPlaying = useRealtimeSelector((rtState) => rtState.time.isPlaying)
  const isMaster = useTypedSelector(
    (state) => state.control.present.master > 0.05
  )
  const blackoutActive = useTypedSelector((state) => state.gui.blackout === true)
  const emergencyStopActive = useTypedSelector(
    (state) =>
      state.control.present.device.connectionSettings.atmospherics
        .emergencyStop === true
  )
  const statusMessages = useTypedSelector((state) => state.gui.statusMessages)
  const statusLogOpen = useTypedSelector((state) => state.gui.statusLogOpen)
  const [displayIndex, setDisplayIndex] = useState(0)

  const systemMessages = useMemo<DisplayMessage[]>(() => {
    const output: DisplayMessage[] = []
    if (emergencyStopActive) {
      output.push({
        id: 'system-emergency-stop',
        level: 'error',
        message: 'EMERGENCY STOP ACTIVE',
      })
    }
    if (blackoutActive) {
      output.push({
        id: 'system-blackout',
        level: 'error',
        message: 'BLACKOUT ACTIVE',
      })
    }
    if (!isPlaying) {
      output.push({
        id: 'system-stopped',
        level: 'warn',
        message: 'STOPPED! Press Play To Continue',
      })
    }
    if (!isMaster) {
      output.push({
        id: 'system-master-low',
        level: 'warn',
        message: 'MASTER LOW! Increase Master Slider To See Lights',
      })
    }
    return output
  }, [blackoutActive, emergencyStopActive, isPlaying, isMaster])

  const messages = useMemo<DisplayMessage[]>(() => {
    const fromStatus: DisplayMessage[] = statusMessages.map((message) => ({
      id: message.id,
      level: message.level,
      message: message.message,
      source: message.source,
      ts: message.ts,
    }))
    if (systemMessages.length === 0 && fromStatus.length === 0) {
      return [
        {
          id: 'all-well',
          level: 'info',
          message: 'All is well',
        },
      ]
    }
    return [...systemMessages, ...fromStatus]
  }, [statusMessages, systemMessages])

  useEffect(() => {
    setDisplayIndex(0)
  }, [messages.length])

  useEffect(() => {
    if (messages.length <= 1) {
      return
    }
    const timer = window.setInterval(() => {
      setDisplayIndex((prev) => (prev + 1) % messages.length)
    }, 3200)
    return () => {
      window.clearInterval(timer)
    }
  }, [messages])

  const active = messages[displayIndex % Math.max(1, messages.length)]
  const criticalActive = blackoutActive || emergencyStopActive
  const criticalMessage = emergencyStopActive
    ? blackoutActive
      ? 'EMERGENCY STOP + BLACKOUT ACTIVE - OUTPUTS BLOCKED - '
      : 'EMERGENCY STOP ACTIVE - ATMOS OUTPUT BLOCKED - '
    : blackoutActive
      ? 'BLACKOUT ACTIVE - LIGHT OUTPUT MUTED - '
      : ''
  const hasActionableMessages =
    statusMessages.length > 0 || systemMessages.length > 0 || criticalActive
  const style = styleForLevel(active.level)

  return (
    <>
      <Root
        $critical={criticalActive}
        role={hasActionableMessages ? 'button' : undefined}
        tabIndex={hasActionableMessages ? 0 : -1}
        onClick={() => {
          if (hasActionableMessages) {
            dispatch(setStatusLogOpen(true))
          }
        }}
        onKeyDown={(event) => {
          if (!hasActionableMessages) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            dispatch(setStatusLogOpen(true))
          }
        }}
        style={{
          color: criticalActive ? undefined : style.color,
          backgroundColor: criticalActive ? undefined : style.backgroundColor,
          cursor: hasActionableMessages ? 'pointer' : 'default',
        }}
        title={
          criticalActive
            ? 'Critical output state active. Click to open status log'
            : hasActionableMessages
              ? 'Click to open status log'
              : 'Status'
        }
      >
        {criticalActive ? (
          <MarqueeWrap>
            <MarqueeText>{criticalMessage.repeat(4)}</MarqueeText>
          </MarqueeWrap>
        ) : (
          active.message
        )}
      </Root>
      <AppModal
        open={statusLogOpen}
        title="Status Log"
        message="Recent status and error messages."
        onClose={() => dispatch(setStatusLogOpen(false))}
        actions={[
          {
            label: 'Clear',
            onClick: () => dispatch(clearStatusMessages()),
          },
          {
            label: 'Close',
            onClick: () => dispatch(setStatusLogOpen(false)),
          },
        ]}
      >
        <LogList>
          {systemMessages.map((message) => (
            <LogRow key={message.id}>
              <LogLevel $level={message.level}>{message.level.toUpperCase()}</LogLevel>
              <LogMessage>{message.message}</LogMessage>
            </LogRow>
          ))}
          {statusMessages.length === 0 && systemMessages.length === 0 && (
            <LogMessage>All is well.</LogMessage>
          )}
          {[...statusMessages]
            .sort((a, b) => b.ts - a.ts)
            .map((message: StatusMessage) => (
              <LogRow key={message.id}>
                <LogLevel $level={message.level}>{message.level.toUpperCase()}</LogLevel>
                <LogMessage>
                  {message.message}
                  {message.source ? ` (${message.source})` : ''}
                </LogMessage>
                <LogTs>{formatTimestamp(message.ts)}</LogTs>
              </LogRow>
            ))}
        </LogList>
      </AppModal>
    </>
  )
}

function styleForLevel(level: DisplayMessage['level']) {
  if (level === 'error') {
    return {
      color: '#fff',
      backgroundColor: '#a71d1d',
    }
  }
  if (level === 'warn') {
    return {
      color: '#101217',
      backgroundColor: '#f0ba57',
    }
  }
  return {
    color: undefined,
    backgroundColor: undefined,
  }
}

function formatTimestamp(ts: number) {
  const d = new Date(ts)
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  const ss = d.getSeconds().toString().padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

const marquee = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`

const flashCritical = keyframes`
  0% { background-color: #8f1414; }
  50% { background-color: #cb1f1f; }
  100% { background-color: #8f1414; }
`

const RootCritical = css`
  border-top-color: #ffb0b077;
  color: #ffffff;
  animation: ${flashCritical} 0.95s linear infinite;
`

const Root = styled.div<{ $critical: boolean }>`
  position: relative;
  color: ${(props) => props.theme.colors.text.secondary};
  border-top: 1px solid #383838;
  padding: 0.3rem 0.6rem;
  user-select: text;
  background-color: ${(props) => props.theme.colors.bg.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  ${(props) => (props.$critical ? RootCritical : '')}
`

const MarqueeWrap = styled.div`
  overflow: hidden;
  width: 100%;
  white-space: nowrap;
`

const MarqueeText = styled.div`
  display: inline-block;
  font-size: 1.02rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  animation: ${marquee} 7.2s linear infinite;
`

const LogList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  max-height: min(22rem, 55vh);
  overflow: auto;
  padding-right: 0.2rem;
`

const LogRow = styled.div`
  border: 1px solid #ffffff1f;
  border-radius: 0.35rem;
  padding: 0.38rem 0.45rem;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.45rem;
  align-items: center;
`

const LogLevel = styled.span<{ $level: 'info' | 'warn' | 'error' }>`
  font-size: 0.68rem;
  border: 1px solid #ffffff44;
  border-radius: 0.22rem;
  padding: 0.1rem 0.22rem;
  color: ${(props) =>
    props.$level === 'error'
      ? '#ffadad'
      : props.$level === 'warn'
        ? '#ffd57a'
        : '#cbd7ef'};
`

const LogMessage = styled.div`
  font-size: 0.82rem;
  color: ${(props) => props.theme.colors.text.primary};
`

const LogTs = styled.div`
  font-size: 0.7rem;
  color: ${(props) => props.theme.colors.text.secondary};
`
