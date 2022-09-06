import { useRealtimeSelector } from 'renderer/redux/realtimeStore'
import styled from 'styled-components'

interface Props {}

export default function AudioInput({}: Props) {
  return (
    <Root>
      {/* <MicIcon />
      <Sp /> */}
      <Level />
      <Sp />
      <Confidence />
    </Root>
  )
}

function Level() {
  const rms = useRealtimeSelector((state) => state.time.audio.rms)

  const skewed = rms ** 0.3

  const pct = Math.min(skewed, 1.0) * 100

  return (
    <LevelRoot>
      <LevelFill style={{ top: `${100 - pct}%` }} />
    </LevelRoot>
  )
}

function Confidence() {
  const confidence = useRealtimeSelector(
    (state) => state.time.audio.bpmConfidence
  )

  const skewed = confidence ** 0.3

  const pct = Math.min(skewed, 2.0) * 50

  return (
    <LevelRoot>
      <LevelFill style={{ top: `${100 - pct}%`, backgroundColor: '#33f' }} />
    </LevelRoot>
  )
}

const Root = styled.div`
  display: flex;
  align-items: center;
`

const Sp = styled.div`
  width: 0.5rem;
`

const LevelRoot = styled.div`
  height: 3rem;
  position: relative;
  background-color: #000;
  width: 0.3rem;
`

const LevelFill = styled.div`
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  background-color: #3f3;
`
