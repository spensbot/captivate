import { useRealtimeSelector } from '../redux/realtimeStore'
import Window2D from '../base/Window2D'

export default function XYWindow() {
  const { height, width, x, y } = useRealtimeSelector(
    (state) => state.outputParams
  )

  return (
    <Window2D
      window2D={{
        x: {
          pos: x,
          width: width,
        },
        y: {
          pos: y,
          width: height,
        },
      }}
    />
  )
}
