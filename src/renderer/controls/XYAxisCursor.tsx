import { useOutputParam } from '../redux/realtimeStore'
import Cursor from '../base/Cursor'

interface Props {
  splitIndex: number | null
}

export default function XYAxisCursor({ splitIndex }: Props) {
  const xOut = useOutputParam('xAxis', splitIndex)
  const yOut = useOutputParam('yAxis', splitIndex)

  return <Cursor x={xOut} y={yOut} color="#fff" withHorizontal withVertical />
}
