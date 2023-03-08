import { send_user_command } from '../ipcHandler'
import { useRealtimeSelector } from 'renderer/redux/realtimeStore'
import useDragBasic from 'renderer/hooks/useDragBasic'
import { SliderMidiOverlay } from 'renderer/base/MidiOverlay'
import styled from 'styled-components'

export default function BPM() {
  const bpm = useRealtimeSelector((state) => state.time.bpm)
  const bpmUnconfident = useRealtimeSelector(
    (state) => state.time.audio.bpmUnconfident
  )
  const confidence = useRealtimeSelector(
    (state) => state.time.audio.bpmConfidence
  )

  const [dragContainer, onMouseDown] = useDragBasic((e) => {
    const dx = e.movementX / 3
    const dy = -e.movementY / 3
    send_user_command({ type: 'IncrementTempo', amount: dx + dy })
  })

  return (
    <SliderMidiOverlay action={{ type: 'setBpm' }}>
      <Root>
        <Large ref={dragContainer} onMouseDown={onMouseDown}>
          {`${Math.round(bpm)} BPM`}
        </Large>
        <Small>{`${Math.round(bpmUnconfident)} - ${confidence.toFixed(
          3
        )}`}</Small>
        <Bar>
          <Confidence style={{ width: `${confidence * 0.12 * 2 * 100}%` }} />
        </Bar>
      </Root>
    </SliderMidiOverlay>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`

const Large = styled.div`
  cursor: nesw-resize;
  user-select: none;
`

const Small = styled.div`
  font-size: 0.85rem;
`

const Bar = styled.div`
  width: 3rem;
  height: 0.3rem;
  position: relative;
`

const Confidence = styled.div`
  top: 0;
  left: 0;
  bottom: 0;
  position: absolute;
`
