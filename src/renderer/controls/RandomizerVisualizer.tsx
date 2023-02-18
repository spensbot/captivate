import styled from 'styled-components'
import { useRealtimeSelector } from 'renderer/redux/realtimeStore'
import { useBaseParam } from 'renderer/redux/store'
import { applyRandomization } from 'shared/randomizer'

interface Props {
  splitIndex: number
}

const gapRatio = 0.5

export default function RandomizerVisualizer({ splitIndex }: Props) {
  return (
    <Root>
      <Visualizer splitIndex={splitIndex} />
    </Root>
  )
}

const Root = styled.div`
  flex: 1 0 0;
  padding: 0.3rem;
`

function Visualizer({ splitIndex }: Props) {
  const randomizerMix = useBaseParam('randomize', splitIndex) ?? 0
  const { splitStates } = useRealtimeSelector((rtState) => rtState)

  let levels =
    splitStates[splitIndex]?.randomizer?.map((point) => point.level) ?? []

  const divsAndGaps =
    levels.length === 0 ? (
      <Gap />
    ) : (
      Array(levels.length * 2 - 1)
        .fill(0)
        .map((_v, i) => {
          if (i % 2 === 0) {
            let level = levels[i / 2]
            let randomizedLevel = applyRandomization(1.0, level, randomizerMix)
            return (
              <Div
                key={i}
                style={{
                  backgroundColor: `hsl(0, 0%, ${randomizedLevel * 100}%)`,
                }}
              />
            )
          } else {
            return <Gap key={i} />
          }
        })
    )
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
  max-width: 0.5rem;
`
