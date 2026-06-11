import { useEffect, useRef, useState } from 'react'
import { send_user_command } from '../ipcHandler'
import { useRealtimeSelector } from 'renderer/redux/realtimeStore'
import useDragBasic from 'renderer/hooks/useDragBasic'
import { SliderMidiOverlay } from 'renderer/base/MidiOverlay'
import {
  StatusBarBpmRow,
  StatusBarControlShell,
  StatusBarFieldInput,
  StatusBarLabel,
  StatusBarReadout,
  StatusBarStepButton,
} from './statusBarUi'

function clampBpm(value: number) {
  if (!Number.isFinite(value)) return 120
  return Math.min(300, Math.max(20, value))
}

const TEMPO_DRAG_FLUSH_MS = 50

export default function BPM() {
  const bpm = useRealtimeSelector((state) => state.time.bpm)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(() => `${Math.round(bpm)}`)
  const tempoDragAccumRef = useRef(0)
  const tempoDragFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  useEffect(() => {
    if (!isEditing) {
      setDraft(`${Math.round(bpm)}`)
    }
  }, [bpm, isEditing])

  const flushTempoDrag = () => {
    if (tempoDragFlushTimerRef.current !== null) {
      clearTimeout(tempoDragFlushTimerRef.current)
      tempoDragFlushTimerRef.current = null
    }
    const amount = tempoDragAccumRef.current
    tempoDragAccumRef.current = 0
    if (amount === 0) {
      return
    }
    send_user_command({ type: 'IncrementTempo', amount })
  }

  const scheduleTempoDragFlush = () => {
    if (tempoDragFlushTimerRef.current !== null) {
      return
    }
    tempoDragFlushTimerRef.current = setTimeout(() => {
      tempoDragFlushTimerRef.current = null
      flushTempoDrag()
    }, TEMPO_DRAG_FLUSH_MS)
  }

  useEffect(() => {
    return () => {
      flushTempoDrag()
    }
  }, [])

  const [dragContainer, onMouseDown] = useDragBasic((e) => {
    if (isEditing) return
    const dx = e.movementX / 3
    const dy = -e.movementY / 3
    tempoDragAccumRef.current += dx + dy
    scheduleTempoDragFlush()
  })

  const applyDraft = () => {
    const parsed = Number(draft)
    if (!Number.isFinite(parsed)) {
      setDraft(`${Math.round(bpm)}`)
      return
    }
    const next = clampBpm(parsed)
    send_user_command({ type: 'SetBPM', bpm: next })
    setDraft(`${Math.round(next)}`)
  }

  const stepBpm = (delta: number) => {
    const next = clampBpm(Math.round(bpm) + delta)
    send_user_command({ type: 'SetBPM', bpm: next })
  }

  return (
    <SliderMidiOverlay action={{ type: 'setBpm' }}>
      <StatusBarControlShell>
        <StatusBarLabel>BPM</StatusBarLabel>
        <StatusBarBpmRow>
          <StatusBarStepButton
            type="button"
            onClick={() => stepBpm(-1)}
            title="Decrease tempo by 1 BPM"
          >
            −
          </StatusBarStepButton>
          {isEditing ? (
            <StatusBarFieldInput
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => {
                applyDraft()
                setIsEditing(false)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  ;(event.target as HTMLInputElement).blur()
                } else if (event.key === 'Escape') {
                  setDraft(`${Math.round(bpm)}`)
                  setIsEditing(false)
                }
              }}
              title="Type BPM, Enter or click away to apply"
            />
          ) : (
            <StatusBarReadout
              ref={dragContainer}
              onMouseDown={onMouseDown}
              onClick={() => setIsEditing(true)}
              title="Click to type, drag to adjust, or MIDI-map tempo"
            >
              {Math.round(bpm)}
            </StatusBarReadout>
          )}
          <StatusBarStepButton
            type="button"
            onClick={() => stepBpm(1)}
            title="Increase tempo by 1 BPM"
          >
            +
          </StatusBarStepButton>
        </StatusBarBpmRow>
      </StatusBarControlShell>
    </SliderMidiOverlay>
  )
}
