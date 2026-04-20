import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { send_user_command } from '../ipcHandler'
import { useRealtimeSelector } from 'renderer/redux/realtimeStore'
import useDragBasic from 'renderer/hooks/useDragBasic'
import { SliderMidiOverlay } from 'renderer/base/MidiOverlay'

function clampBpm(value: number) {
  if (!Number.isFinite(value)) return 120
  return Math.min(300, Math.max(20, value))
}

export default function BPM() {
  const bpm = useRealtimeSelector((state) => state.time.bpm)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(() => `${Math.round(bpm)}`)

  useEffect(() => {
    if (!isEditing) {
      setDraft(`${Math.round(bpm)}`)
    }
  }, [bpm, isEditing])

  const [dragContainer, onMouseDown] = useDragBasic((e) => {
    if (isEditing) return
    const dx = e.movementX / 3
    const dy = -e.movementY / 3
    send_user_command({ type: 'IncrementTempo', amount: dx + dy })
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
      <Root>
        {isEditing ? (
          <Input
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
            title="Type BPM and click away to apply"
          />
        ) : (
          <Readout
            ref={dragContainer}
            onMouseDown={onMouseDown}
            onClick={() => setIsEditing(true)}
            title="Click to type tempo, drag to adjust, MIDI-assignable"
          >
            {`${Math.round(bpm)} BPM`}
          </Readout>
        )}
        <Stepper>
          <StepButton
            type="button"
            onClick={() => stepBpm(1)}
            title="Increase tempo by 1 BPM"
          >
            +
          </StepButton>
          <StepButton
            type="button"
            onClick={() => stepBpm(-1)}
            title="Decrease tempo by 1 BPM"
          >
            -
          </StepButton>
        </Stepper>
      </Root>
    </SliderMidiOverlay>
  )
}

const Root = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
`

const Readout = styled.div`
  cursor: nesw-resize;
  user-select: none;
  min-width: 5.3rem;
  text-align: right;
`

const Input = styled.input`
  width: 5.5rem;
  background: #0006;
  border: 1px solid #ffffff44;
  border-radius: 0.26rem;
  color: #eef4ff;
  padding: 0.1rem 0.3rem;
  text-align: right;
`

const Stepper = styled.div`
  display: grid;
  grid-template-rows: 1fr 1fr;
  gap: 0.12rem;
`

const StepButton = styled.button`
  width: 1.25rem;
  height: 0.85rem;
  line-height: 0.75rem;
  padding: 0;
  border-radius: 0.2rem;
  border: 1px solid #ffffff44;
  background: #0007;
  color: #dde7fb;
  cursor: pointer;
  font-size: 0.7rem;
`
