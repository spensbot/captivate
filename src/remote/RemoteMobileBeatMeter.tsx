import styled from 'styled-components'
import { useRealtimeSelector } from '../renderer/redux/realtimeStore'

/** Centered beat-phase meter for remote mobile transport row. */
export default function RemoteMobileBeatMeter() {
  const time = useRealtimeSelector((state) => state.time)
  const beats = Array(time.quantum).fill(0)
  beats[Math.floor(time.phase)] = 1 - (time.phase % 1.0)

  return (
    <Meter aria-label="Beat phase within bar">
      {beats.map((beat, index) => (
        <Segment key={index} $opacity={beat} />
      ))}
    </Meter>
  )
}

const Meter = styled.div`
  display: flex;
  flex-direction: row;
  width: min(14rem, 72vw);
  height: 0.65rem;
  background-color: #0008;
  border-radius: 0.2rem;
  overflow: hidden;
`

const Segment = styled.div<{ $opacity: number }>`
  flex: 1 0 0;
  background-color: #fff;
  opacity: ${(p) => p.$opacity};
`
