import { useOutputParam } from '../redux/realtimeStore'
import Cursor from '../base/Cursor'
import { applyMirror } from 'features/dmx/shared/dmxUtil'

interface Props {
  splitIndex: number
}

export default function XYAxisCursor({ splitIndex }: Props) {
  const xOut = useOutputParam('xAxis', splitIndex)
  const yOut = useOutputParam('yAxis', splitIndex)
  const xMirror = useOutputParam('xMirror', splitIndex)

  return (
    <>
      <Cursor
        x={applyMirror(xOut, xMirror)}
        y={yOut}
        color="#777"
        withHorizontal
        withVertical
      />
      <Cursor x={xOut} y={yOut} color="#fff" withHorizontal withVertical />
    </>
  )
}
