import { useOutputParam } from '../redux/realtimeStore'
import Cursor from '../base/Cursor'
import { applyMirror } from 'shared/dmxUtil'
import { useBaseParam } from 'renderer/redux/store'

interface Props {
  splitIndex: number
}

export default function XYAxisCursor({ splitIndex }: Props) {
  const xBase = useBaseParam('xAxis', splitIndex) ?? 0.5
  const yBase = useBaseParam('yAxis', splitIndex) ?? 0.5
  const xMirrorBase = useBaseParam('xMirror', splitIndex) ?? 0

  const xOut = useOutputParam('xAxis', splitIndex)
  const yOut = useOutputParam('yAxis', splitIndex)
  const xMirror = useOutputParam('xMirror', splitIndex)

  return (
    <>
      <Cursor x={xBase} y={yBase} radius={0.22} thickness={1} color="#ffcc66" />
      {xMirrorBase > 0.5 && (
        <Cursor
          x={applyMirror(xBase, xMirrorBase)}
          y={yBase}
          radius={0.22}
          thickness={1}
          color="#ffcc66"
        />
      )}
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
