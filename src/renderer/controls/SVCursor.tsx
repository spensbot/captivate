import { useOutputParam } from '../redux/realtimeStore'
import Cursor from '../base/Cursor'

interface Props {
  splitIndex: number | null
}

export default function SVCursor({ splitIndex }: Props) {
  const saturation = useOutputParam('saturation', splitIndex)
  const brightness = useOutputParam('brightness', splitIndex)
  let xOut = saturation
  let yOut = brightness

  return <Cursor x={xOut} y={yOut} color="#fff" withHorizontal withVertical />
}
