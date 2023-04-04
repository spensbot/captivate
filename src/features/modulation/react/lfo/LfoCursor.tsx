import { useRealtimeSelector } from '../../../../renderer/redux/realtimeStore'
import Cursor from '../../../../renderer/base/Cursor'
import { GetValueFromPhase, GetPhase } from '../../shared/oscillator'
import { useActiveLightScene } from '../../../../renderer/redux/store'

export default function LfoCursor({
  index,
  padding,
}: {
  index: number
  padding: number
}) {
  const time = useRealtimeSelector((state) => state.time)
  const lfo = useActiveLightScene(
    (activeScene) => activeScene.modulators[index].lfo
  )
  const phase = GetPhase(lfo, time.beats)
  const value = GetValueFromPhase(lfo, phase)

  const scale = 1 - padding * 2

  return (
    <Cursor
      x={phase * scale + padding}
      y={value * scale + padding}
      color="#fff"
      withVertical
    />
  )
}
