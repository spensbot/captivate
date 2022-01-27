import { useRealtimeSelector } from '../redux/realtimeStore'
import { useControlSelector } from '../redux/store'
import Cursor from '../base/Cursor'

export default function SVCursor() {
  const outputParams = useRealtimeSelector((state) => state.outputParams)
  let xOut = outputParams.saturation
  let yOut = outputParams.brightness

  // const baseParams = useControlSelector(
  //   (state) => state.byId[state.active].baseParams
  // )
  // const x = baseParams.saturation
  // const y = baseParams.brightness

  return <Cursor x={xOut} y={yOut} color="#fff" withHorizontal withVertical />
}
