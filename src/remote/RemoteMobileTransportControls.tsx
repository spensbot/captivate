import { useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import styled from 'styled-components'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import StopIcon from '@mui/icons-material/Stop'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { send_user_command } from '../renderer/ipcHandler'
import { useRealtimeSelector } from '../renderer/redux/realtimeStore'
import { ButtonMidiOverlay } from '../renderer/base/MidiOverlay'
import { SliderMidiOverlay } from '../renderer/base/MidiOverlay'
import useDragMapped from '../renderer/hooks/useDragMapped'
import { useControlSelector, useTypedSelector } from '../renderer/redux/store'
import { setMaster } from '../renderer/redux/controlSlice'
import { setBlackout } from '../renderer/redux/guiSlice'
import RemoteMobileBeatMeter from './RemoteMobileBeatMeter'
import {
  REMOTE_MOBILE_CONTROL_FONT,
  REMOTE_MOBILE_ROUND_BTN_SIZE,
  REMOTE_MOBILE_TRANSPORT_ROW_HEIGHT,
} from './remoteMobileTransportTokens'

function clampBpm(value: number) {
  if (!Number.isFinite(value)) return 120
  return Math.min(300, Math.max(20, value))
}

function RemoteMobileStartStop() {
  const time = useRealtimeSelector((rt) => rt.time)
  return (
    <RoundActionButton
      type="button"
      title={time.isPlaying ? 'Stop transport' : 'Start transport'}
      onClick={() =>
        send_user_command({
          type: 'SetIsPlaying',
          isPlaying: !time.isPlaying,
        })
      }
      aria-label={time.isPlaying ? 'Stop' : 'Play'}
    >
      {time.isPlaying ? (
        <StopIcon sx={{ fontSize: '2rem' }} />
      ) : (
        <PlayArrowIcon sx={{ fontSize: '2rem' }} />
      )}
    </RoundActionButton>
  )
}

function RemoteMobileTapTempo() {
  return (
    <ButtonMidiOverlay action={{ type: 'tapTempo' }}>
      <RoundActionButton
        type="button"
        title="Tap repeatedly to set tempo"
        onClick={() => send_user_command({ type: 'TapTempo' })}
        aria-label="Tap tempo"
      >
        TAP
      </RoundActionButton>
    </ButtonMidiOverlay>
  )
}

function RemoteMobileBpmCenter() {
  const bpm = useRealtimeSelector((state) => state.time.bpm)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(() => `${Math.round(bpm)}`)

  useEffect(() => {
    if (!isEditing) {
      setDraft(`${Math.round(bpm)}`)
    }
  }, [bpm, isEditing])

  const applyDraft = () => {
    const parsed = Number(draft)
    if (!Number.isFinite(parsed)) {
      setDraft(`${Math.round(bpm)}`)
      return
    }
    send_user_command({ type: 'SetBPM', bpm: clampBpm(parsed) })
    setDraft(`${Math.round(clampBpm(parsed))}`)
  }

  const step = (delta: number) => {
    send_user_command({
      type: 'SetBPM',
      bpm: clampBpm(Math.round(bpm) + delta),
    })
  }

  return (
    <SliderMidiOverlay action={{ type: 'setBpm' }}>
      <BpmCluster>
        <RoundActionButton
          type="button"
          title="Decrease BPM"
          onClick={() => step(-1)}
          aria-label="Decrease BPM"
        >
          <ChevronLeftIcon sx={{ fontSize: '2rem' }} />
        </RoundActionButton>
        {isEditing ? (
          <BpmInput
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              applyDraft()
              setIsEditing(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                ;(e.target as HTMLInputElement).blur()
              } else if (e.key === 'Escape') {
                setDraft(`${Math.round(bpm)}`)
                setIsEditing(false)
              }
            }}
            aria-label="BPM value"
          />
        ) : (
          <BpmReadout
            type="button"
            onClick={() => setIsEditing(true)}
            title="Tap to type BPM"
          >
            {Math.round(bpm)} BPM
          </BpmReadout>
        )}
        <RoundActionButton
          type="button"
          title="Increase BPM"
          onClick={() => step(1)}
          aria-label="Increase BPM"
        >
          <ChevronRightIcon sx={{ fontSize: '2rem' }} />
        </RoundActionButton>
      </BpmCluster>
    </SliderMidiOverlay>
  )
}

function RemoteMobileBlackout() {
  const dispatch = useDispatch()
  const isBlackout = useTypedSelector((state) => state.gui.blackout)
  return (
    <ButtonMidiOverlay
      action={{ type: 'toggleBlackout' }}
      style={{ flex: '1 1 8rem', minWidth: 0, display: 'flex' }}
    >
      <BlackoutBtn
        type="button"
        $active={isBlackout}
        title="Blackout all output"
        onClick={() => dispatch(setBlackout(!isBlackout))}
      >
        BLACKOUT
      </BlackoutBtn>
    </ButtonMidiOverlay>
  )
}

function RemoteMobileMaster() {
  const master = useControlSelector((state) => state.master)
  const dispatch = useDispatch()
  const percent = Math.round(master * 100)
  const hot = percent >= 85
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [, onHandlePointerDown] = useDragMapped(
    ({ x }) => {
      dispatch(setMaster(x))
    },
    { containerRef: trackRef, axis: 'horizontal', thresholdPx: 0 }
  )
  return (
    <MasterBlock title="Master output">
      <MasterLabel>MASTER</MasterLabel>
      <SliderMidiOverlay
        action={{ type: 'setMaster' }}
        style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex' }}
      >
        <MasterTrack ref={trackRef}>
          <MasterTrackGradient aria-hidden />
          <MasterTrackMask style={{ width: `${100 - percent}%` }} aria-hidden />
          <HorizontalWideFaderCap
            $hot={hot}
            $value={master}
            onPointerDown={onHandlePointerDown}
            aria-hidden
          />
        </MasterTrack>
      </SliderMidiOverlay>
      <MasterValue>{percent}%</MasterValue>
    </MasterBlock>
  )
}

/** Mobile-only transport + master/blackout (not used on desktop remote). */
export default function RemoteMobileTransportControls() {
  return (
    <Root>
      <TransportRow>
        <SideSlot $align="start">
          <RemoteMobileStartStop />
        </SideSlot>
        <CenterSlot>
          <RemoteMobileBpmCenter />
        </CenterSlot>
        <SideSlot $align="end">
          <RemoteMobileTapTempo />
        </SideSlot>
      </TransportRow>
      <BeatRow>
        <RemoteMobileBeatMeter />
      </BeatRow>
      <OutputRow>
        <RemoteMobileBlackout />
        <RemoteMobileMaster />
      </OutputRow>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
`

const TransportRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  min-height: ${REMOTE_MOBILE_TRANSPORT_ROW_HEIGHT};
  height: ${REMOTE_MOBILE_TRANSPORT_ROW_HEIGHT};
  width: 100%;
  gap: 0.35rem;
`

const SideSlot = styled.div<{ $align: 'start' | 'end' }>`
  display: flex;
  align-items: center;
  justify-content: ${(p) => (p.$align === 'start' ? 'flex-start' : 'flex-end')};
  min-width: ${REMOTE_MOBILE_ROUND_BTN_SIZE};
`

const CenterSlot = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
`

const BeatRow = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
`

const OutputRow = styled.div`
  display: flex;
  align-items: stretch;
  gap: 0.5rem;
  width: 100%;
  min-height: 3.1rem;
`

const RoundActionButton = styled.button`
  width: ${REMOTE_MOBILE_ROUND_BTN_SIZE};
  height: ${REMOTE_MOBILE_ROUND_BTN_SIZE};
  min-width: ${REMOTE_MOBILE_ROUND_BTN_SIZE};
  min-height: ${REMOTE_MOBILE_ROUND_BTN_SIZE};
  border-radius: 50%;
  border: 1px solid #ffffff33;
  background: #3d5a80;
  color: #f0f6ff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
  touch-action: manipulation;
  font-size: ${REMOTE_MOBILE_CONTROL_FONT};
  font-weight: 700;
  letter-spacing: 0.04em;
  box-sizing: border-box;
  flex-shrink: 0;

  &:active {
    background: #4a6d96;
  }
`

const BpmCluster = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  height: ${REMOTE_MOBILE_TRANSPORT_ROW_HEIGHT};
  min-width: 0;
`

const BpmReadout = styled.button`
  border: none;
  background: transparent;
  color: inherit;
  font-size: ${REMOTE_MOBILE_CONTROL_FONT};
  font-weight: 700;
  font-family: inherit;
  padding: 0 0.25rem;
  min-width: 5.5rem;
  text-align: center;
  cursor: pointer;
  touch-action: manipulation;
  white-space: nowrap;
`

const BpmInput = styled.input`
  width: 5.5rem;
  height: 2rem;
  font-size: ${REMOTE_MOBILE_CONTROL_FONT};
  font-weight: 700;
  text-align: center;
  border-radius: 0.35rem;
  border: 1px solid #ffffff44;
  background: #0007;
  color: #eef4ff;
  box-sizing: border-box;
`

const BlackoutBtn = styled.button<{ $active: boolean }>`
  flex: 1 1 auto;
  width: 100%;
  min-height: 3.1rem;
  border-radius: 0.45rem;
  border: 1px solid ${(p) => (p.$active ? '#ffaaaa' : '#c9b06a')};
  background: ${(p) =>
    p.$active
      ? 'linear-gradient(180deg, #9a1818 0%, #5c0c0c 100%)'
      : 'linear-gradient(180deg, #3d4554 0%, #252b36 100%)'};
  color: #f4f4f4;
  font-size: ${REMOTE_MOBILE_CONTROL_FONT};
  font-weight: 800;
  letter-spacing: 0.06em;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
`

const MasterBlock = styled.div`
  flex: 2 1 12rem;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.4rem 0.55rem;
  border-radius: 0.45rem;
  border: 1px solid #d6ebff55;
  background: linear-gradient(180deg, #1a2433 0%, #0c121c 100%);
  box-sizing: border-box;
`

const MasterLabel = styled.span`
  font-size: ${REMOTE_MOBILE_CONTROL_FONT};
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #e8f3ff;
  flex-shrink: 0;
`

const MasterTrack = styled.div`
  position: relative;
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  height: 2.35rem;
  border-radius: 0.32rem;
  border: 1px solid #d3e7ff44;
  background: #050a11;
  overflow: hidden;
  box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.55);
`

const MasterTrackGradient = styled.div`
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(90deg, #0b0b0b 0%, #ffffff 100%);
  box-shadow: 0 0 0.5rem #ffffff33;
  pointer-events: none;
`

const MasterTrackMask = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  background: #050a11;
  pointer-events: none;
`

const HorizontalWideFaderCap = styled.div<{ $value: number; $hot: boolean }>`
  position: absolute;
  top: 3%;
  height: 94%;
  width: 1.35rem;
  min-width: 2.35rem;
  left: ${(p) => p.$value * 100}%;
  transform: translateX(-50%);
  border-radius: 0.24rem;
  border: 1px solid ${(p) => (p.$hot ? '#ffffffcc' : '#8a8a8a')};
  background: ${(p) =>
    p.$hot
      ? 'linear-gradient(180deg, #f6f6f6 0%, #c8c8c8 42%, #8e8e8e 100%)'
      : 'linear-gradient(180deg, #ececec 0%, #b4b4b4 45%, #757575 100%)'};
  box-shadow:
    0 2px 5px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.72),
    inset 0 -2px 0 rgba(0, 0, 0, 0.22);
  z-index: 2;
  touch-action: none;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }

  &::before {
    content: '';
    position: absolute;
    top: 14%;
    bottom: 14%;
    left: 50%;
    width: 1px;
    transform: translateX(-50%);
    background: repeating-linear-gradient(
      180deg,
      rgba(0, 0, 0, 0.28) 0,
      rgba(0, 0, 0, 0.28) 2px,
      transparent 2px,
      transparent 5px
    );
    opacity: 0.55;
  }
`

const MasterValue = styled.span`
  font-size: ${REMOTE_MOBILE_CONTROL_FONT};
  font-weight: 700;
  color: #e8f3ff;
  min-width: 2.75rem;
  text-align: right;
  flex-shrink: 0;
`
