import { useOutputParam } from '../redux/realtimeStore'
import Window2D from '../base/Window2D'

interface Props {
  splitIndex: number
}

export default function XYWindow({ splitIndex }: Props) {
  const x = useOutputParam('x', splitIndex)
  const y = useOutputParam('y', splitIndex)
  const width = useOutputParam('width', splitIndex)
  const height = useOutputParam('height', splitIndex)

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
