import { send_user_command } from '../../ipcHandler'
import { useRealtimeSelector } from 'renderer/redux/realtimeStore'
import useDragBasic from 'renderer/hooks/useDragBasic'
import { SliderMidiOverlay } from 'features/midi/react/MidiOverlay'

export default function BPM() {
  const bpm = useRealtimeSelector((state) => state.time.bpm)

  const [dragContainer, onMouseDown] = useDragBasic((e) => {
    const dx = e.movementX / 3
    const dy = -e.movementY / 3
    send_user_command({ type: 'IncrementTempo', amount: dx + dy })
  })

  return (
    <SliderMidiOverlay action={{ type: 'SetBPM' }}>
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
    </SliderMidiOverlay>
  )
}
