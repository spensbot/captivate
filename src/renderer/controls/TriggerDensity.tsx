import styled from '@emotion/styled'
import { useActiveScene } from '../redux/store'
import Slider from '../base/Slider'
import { useDispatch } from 'react-redux'
import { setRandomizer } from '../redux/scenesSlice'
import { initRandomizerState, syncAndUpdate } from '../../engine/randomizer'
import { useRealtimeSelector } from 'renderer/redux/realtimeStore'
import { useRef } from 'react'

interface Props {}

const divCount = 20
const gapRatio = 0.5

export default function TriggerDensity({}: Props) {
  return (
    <Root>
      <Visualizer />
    </Root>
  )
}

const Root = styled.div`
  flex: 1 0 0;
  padding: 0.3rem;
`

function Visualizer() {
  const persistedState = useRef(initRandomizerState())
  const randomizerOptions = useActiveScene((scene) => scene.randomizer)
  const timeState = useRealtimeSelector((rs) => rs.time)

  persistedState.current = syncAndUpdate(
    persistedState.current,
    divCount,
    timeState,
    randomizerOptions
  )

  const divsAndGaps = Array(divCount * 2 - 1)
    .fill(0)
    .map((_v, i) => {
      if (i % 2 === 0) {
        return (
          <Div
            key={i}
            style={{
              backgroundColor: `hsl(0, 0%, ${
                persistedState.current[i / 2].level * 100
              }%)`,
            }}
          />
        )
      } else {
        return <Gap key={i} />
      }
    })
  return <VRoot>{divsAndGaps}</VRoot>
}

const VRoot = styled.div`
  display: flex;
  height: 100%;
`

const Div = styled.div`
  flex: 1 0 0;
  background-color: #555;
`

const Gap = styled.div`
  flex: ${gapRatio} 0 0;
`
