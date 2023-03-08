import { useOutputParam } from '../redux/realtimeStore'
import Cursor from '../base/Cursor'
import { useBaseParam } from '../redux/store'

interface Props {
  splitIndex: number
}

export function XYCursorOutput({ splitIndex }: Props) {
  const xOut = useOutputParam('x', splitIndex)
  const yOut = useOutputParam('y', splitIndex)

  return <Cursor x={xOut} y={yOut} color="#7777" withHorizontal withVertical />
}

export function XYCursorBase({ splitIndex }: Props) {
  const xOut = useBaseParam('x', splitIndex)
  const yOut = useBaseParam('y', splitIndex)

  if (xOut === undefined || yOut === undefined) {
    console.error(
      `Tried to display an SVCursor with an undefined base saturation or brightness`
    )
    return null
  }

  return <Cursor x={xOut} y={yOut} color="#fff" withHorizontal withVertical />
}
