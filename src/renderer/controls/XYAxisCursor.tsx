import { useOutputParam } from '../redux/realtimeStore'
import Cursor from '../base/Cursor'
import { useBaseParam } from 'renderer/redux/store'

interface Props {
  splitIndex: number
}

export default function XYAxisCursor({ splitIndex }: Props) {
  const xBase = useBaseParam('xAxis', splitIndex) ?? 0.5
  const yBase = useBaseParam('yAxis', splitIndex) ?? 0.5

  const xOut = useOutputParam('xAxis', splitIndex)
  const yOut = useOutputParam('yAxis', splitIndex)

  return (
    <>
      <Cursor x={xBase} y={yBase} radius={0.22} thickness={1} color="#ffcc66" />
      <Cursor x={xOut} y={yOut} color="#fff" withHorizontal withVertical />
    </>
  )
}
