import { useOutputParam } from '../redux/realtimeStore'
import Cursor from '../base/Cursor'
import { useBaseParam } from 'renderer/redux/store'

interface Props {
  splitIndex: number | null
}

export function SVCursorOutput({ splitIndex }: Props) {
  const saturation = useOutputParam('saturation', splitIndex)
  const brightness = useOutputParam('brightness', splitIndex)

  return (
    <Cursor
      x={saturation}
      y={brightness}
      color="#7777"
      withHorizontal
      withVertical
    />
  )
}

export function SVCursorBase({ splitIndex }: Props) {
  const saturation = useBaseParam('saturation', splitIndex)
  const brightness = useBaseParam('brightness', splitIndex)

  if (saturation === undefined || brightness === undefined) {
    console.error(
      `Tried to display an SVCursor with an undefined base saturation or brightness`
    )
    return null
  }

  return (
    <Cursor
      x={saturation}
      y={brightness}
      color="#fff"
      withHorizontal
      withVertical
    />
  )
}
