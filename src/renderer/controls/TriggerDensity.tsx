import styled from 'styled-components'
import { useActiveLightScene, useDmxSelector } from '../redux/store'
import { useRealtimeSelector } from 'renderer/redux/realtimeStore'
import {
  getMainGroups,
  getFixturesInGroups,
  getSortedGroups,
} from 'shared/dmxUtil'

interface Props {
  splitIndex: number | null
}

const gapRatio = 0.5

export default function TriggerDensity({ splitIndex }: Props) {
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
  const { universe, fixtureTypesByID } = useDmxSelector((dmx) => dmx)
  const activeLightScene = useActiveLightScene((scene) => scene)
  const { randomizer, outputParams, splitScenes } = useRealtimeSelector(
    (rtState) => rtState
  )
  let groups = getSortedGroups(universe)

  let intensity =
    splitIndex === null
      ? outputParams.intensity
      : splitScenes[splitIndex]?.outputParams?.intensity ?? 0

  let splitFixtures = getFixturesInGroups(
    universe,
    splitIndex === null
      ? getMainGroups(activeLightScene, groups)
      : activeLightScene.splitScenes[splitIndex].groups
  )

  let splitFixturesWithinEpicness = splitFixtures.filter(
    ({ fixture }) =>
      fixtureTypesByID[fixture.type].intensity <= (intensity ?? 0)
  )

  const levels = splitFixturesWithinEpicness.map(
    ({ universeIndex }) => randomizer[universeIndex]?.level ?? 0
  )

  const divsAndGaps =
    levels.length === 0 ? (
      <Gap />
    ) : (
      Array(levels.length * 2 - 1)
        .fill(0)
        .map((_v, i) => {
          if (i % 2 === 0) {
            return (
              <Div
                key={i}
                style={{
                  backgroundColor: `hsl(0, 0%, ${levels[i / 2] * 100}%)`,
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
