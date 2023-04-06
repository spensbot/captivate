import * as api from 'renderer/api'
import { useRealtimeSelector } from 'renderer/redux/realtimeStore'
import useDragBasic from 'features/ui/react/hooks/useDragBasic'
import { RangeMidiOverlay } from 'features/midi/react/MidiOverlay'

export default function BPM() {
  const bpm = useRealtimeSelector((state) => state.time.bpm)

  const [dragContainer, onMouseDown] = useDragBasic((e) => {
    const dx = e.movementX / 3
    const dy = -e.movementY / 3
    api.mutations.user_command({ type: 'IncrementTempo', amount: dx + dy })
  })

  return (
    <RangeMidiOverlay action={{ type: 'SetBPM' }}>
      <div
        ref={dragContainer}
        onMouseDown={onMouseDown}
        style={{
          cursor: 'nesw-resize',
          userSelect: 'none',
        }}
      >
        {`${Math.round(bpm)} BPM`}
      </div>
    </RangeMidiOverlay>
  )
}
