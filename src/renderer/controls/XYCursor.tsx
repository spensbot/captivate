import { useRealtimeSelector } from '../redux/realtimeStore'
import { useTypedSelector } from '../redux/store'
import Cursor from '../base/Cursor'

export default function XYCursor() {
  const outputParams = useRealtimeSelector((state) => state.outputParams)
  const xOut = outputParams.x
  const yOut = outputParams.y

  const baseParams = useTypedSelector(
    (state) => state.scenes.byId[state.scenes.active].baseParams
  )
  const x = baseParams.x
  const y = baseParams.y

  return <Cursor x={xOut} y={yOut} color="#fff" withHorizontal withVertical />
}
