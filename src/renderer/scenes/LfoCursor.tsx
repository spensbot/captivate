import { memo, useMemo } from 'react'
import { useLfoAudioMetrics, useLfoBeats } from '../redux/realtimeSelectors'
import Cursor from '../base/Cursor'
import { GetPhase, LfoShape } from '../../shared/oscillator'
import { useActiveLightScene } from '../redux/store'
import { effectiveLfosAtSplit, getModulatorLfoValue } from '../../shared/modulation'
import { useModPreviewSplit } from './useModPreviewSplit'

function LfoCursor({
  index,
  padding,
}: {
  index: number
  padding: number
}) {
  const lfo = useActiveLightScene(
    (activeScene) => activeScene.modulators[index].lfo
  )
  const beats = useLfoBeats()
  const audio = useLfoAudioMetrics()
  const lightScene = useActiveLightScene((s) => s)
  const splitIx = useModPreviewSplit()
  const effectiveLfo = useMemo(() => {
    const lfos = effectiveLfosAtSplit(
      lightScene,
      splitIx,
      beats,
      audio
    )
    return lfos[index] ?? lfo
  }, [lightScene, splitIx, beats, audio, index, lfo])
  const isAudioShape =
    lfo.shape === LfoShape.AudioBand || lfo.shape === LfoShape.AudioEnergy
  if (isAudioShape) {
    return null
  }
  const phase = isAudioShape ? 1 : GetPhase(effectiveLfo, beats)
  const value = getModulatorLfoValue(effectiveLfo, beats, audio, index)

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

export default memo(LfoCursor)
