import { useRealtimeSelector } from '../redux/realtimeStore'
import Cursor from '../base/Cursor'
import { GetPhase, LfoShape } from '../../shared/oscillator'
import { useActiveLightScene } from '../redux/store'
import { getModulatorLfoValue } from '../../shared/modulation'

export default function LfoCursor({
  index,
  padding,
}: {
  index: number
  padding: number
}) {
  const time = useRealtimeSelector((state) => state.time)
  const audio = useRealtimeSelector((state) => state.audio)
  const lfo = useActiveLightScene(
    (activeScene) => activeScene.modulators[index].lfo
  )
  const isAudioShape =
    lfo.shape === LfoShape.AudioBand || lfo.shape === LfoShape.AudioEnergy
  if (isAudioShape) {
    return null
  }
  const phase = isAudioShape ? 1 : GetPhase(lfo, time.beats)
  const value = getModulatorLfoValue(lfo, time.beats, audio)

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
