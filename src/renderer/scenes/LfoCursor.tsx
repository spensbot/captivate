import { useRealtimeSelector } from '../redux/realtimeStore'
import Cursor from '../base/Cursor'
import { GetValueFromPhase, GetPhase } from '../../shared/oscillator'
import { useActiveLightScene } from '../redux/store'
import {
  audioModulatorValue,
  audioModulatorValueIn,
} from 'shared/audioModulator'

export default function LfoCursor({
  index,
  padding,
}: {
  index: number
  padding: number
}) {
  const time = useRealtimeSelector((state) => state.time)
  const mod = useActiveLightScene(
    (activeScene) => activeScene.modulators[index].mod
  )
  let value = 0
  let phase = 0
  if (mod.type === 'Ramp' || mod.type === 'Sin') {
    phase = GetPhase(mod, time.beats)
    value = GetValueFromPhase(mod, phase)
  } else if (
    mod.type === 'Freq' ||
    mod.type === 'Pitch' ||
    mod.type === 'RMS'
  ) {
    phase = audioModulatorValueIn(mod, time)
    value = audioModulatorValue(mod, time)
  }

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
