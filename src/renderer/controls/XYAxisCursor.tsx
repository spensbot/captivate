import { useOutputParam } from '../redux/realtimeStore'
import Cursor from '../base/Cursor'
import { useBaseParam } from 'renderer/redux/store'
import {
  useMergedSplitAxisParams,
  useMoverPadFixtureTargets,
} from '../hooks/useMoverPadFixtureTargets'

interface Props {
  splitIndex: number
}

export default function XYAxisCursor({ splitIndex }: Props) {
  const xBase = useBaseParam('xAxis', splitIndex) ?? 0.5
  const yBase = useBaseParam('yAxis', splitIndex) ?? 0.5

  const xOut = useOutputParam('xAxis', splitIndex)
  const yOut = useOutputParam('yAxis', splitIndex)
  const mergedOutputParams = useMergedSplitAxisParams(splitIndex)
  const fixtureTargets = useMoverPadFixtureTargets(splitIndex, mergedOutputParams)

  const showFixtureTargets = fixtureTargets !== null && fixtureTargets.length > 0

  return (
    <>
      <Cursor x={xBase} y={yBase} radius={0.22} thickness={1} color="#ffcc66" />
      {showFixtureTargets ? (
        fixtureTargets.map((target) => (
          <Cursor
            key={target.key}
            x={target.x}
            y={target.y}
            radius={0.16}
            thickness={1.5}
            color={target.mirrored ? '#66ccff' : '#ffffff'}
            bgColor={target.mirrored ? '#66ccff33' : '#ffffff22'}
          />
        ))
      ) : (
        <Cursor x={xOut} y={yOut} color="#fff" withHorizontal withVertical />
      )}
    </>
  )
}
