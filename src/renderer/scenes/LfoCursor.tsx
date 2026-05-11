import { useMemo } from 'react'
import { useRealtimeSelector } from '../redux/realtimeStore'
import Cursor from '../base/Cursor'
import { GetPhase, LfoShape } from '../../shared/oscillator'
import { useActiveLightScene } from '../redux/store'
import { effectiveLfosAtSplit, getModulatorLfoValue } from '../../shared/modulation'
import { useModPreviewSplit } from './useModPreviewSplit'

export default function LfoCursor({
  index,
  padding,
}: {
  index: number
  padding: number
}) {
  const lfo = useActiveLightScene(
    (activeScene) => activeScene.modulators[index].lfo
  )
  const time = useRealtimeSelector((state) => state.time)
  const audio = useRealtimeSelector((state) => state.audio)
  const lightScene = useActiveLightScene((s) => s)
  const splitIx = useModPreviewSplit()
  const effectiveLfo = useMemo(() => {
    const lfos = effectiveLfosAtSplit(
      lightScene,
      splitIx,
      time.beats,
      audio
    )
    return lfos[index] ?? lfo
  }, [lightScene, splitIx, time.beats, audio, index, lfo])
  const isAudioShape =
    lfo.shape === LfoShape.AudioBand || lfo.shape === LfoShape.AudioEnergy
  if (isAudioShape) {
    return null
  }
  const phase = isAudioShape ? 1 : GetPhase(effectiveLfo, time.beats)
  const value = getModulatorLfoValue(effectiveLfo, time.beats, audio, index)

  const scale = 1 - padding * 2

  return (
    <span
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 3,
      }}
    >
      <Cursor
        x={phase * scale + padding}
        y={value * scale + padding}
        color="#fff"
        withVertical
      />
    </span>
  )
}
