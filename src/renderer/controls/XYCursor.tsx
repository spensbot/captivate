import { useOutputParam } from '../redux/realtimeStore'
import { useActiveLightScene } from '../redux/store'
import Cursor from '../base/Cursor'

interface Props {
  splitIndex: number | null
}

export default function XYCursor({ splitIndex }: Props) {
  const xOut = useOutputParam('x', splitIndex)
  const yOut = useOutputParam('y', splitIndex)

  const baseParams = useActiveLightScene(
    (activeScene) => activeScene.baseParams
  )
  const x = baseParams.x
  const y = baseParams.y

  return <Cursor x={xOut} y={yOut} color="#fff" withHorizontal withVertical />
}
