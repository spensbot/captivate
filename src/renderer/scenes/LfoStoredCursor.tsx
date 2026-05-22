import { useMemo } from 'react'
import { useRealtimeSelector } from '../redux/realtimeStore'
import Cursor from '../base/Cursor'
import { GetPhase, LfoShape } from '../../shared/oscillator'
import { useActiveLightScene } from '../redux/store'
import {
  effectiveLfosAtSplit,
  intermodPropsIncoming,
  getModulatorLfoValue,
} from '../../shared/modulation'
import { useModPreviewSplit } from './useModPreviewSplit'

/**
 * Manual / stored LFO phase & output (ring) when this LFO receives inter-mod, so it can be
 * compared to {@link LfoCursor} (live effective).
 */
export default function LfoStoredCursor({
  index,
  padding,
}: {
  index: number
  padding: number
}) {
  const lfo = useActiveLightScene(
    (activeScene) => activeScene.modulators[index].lfo
  )
  const lightScene = useActiveLightScene((s) => s)
  const splitIx = useModPreviewSplit()
  const time = useRealtimeSelector((state) => state.time)
  const audio = useRealtimeSelector((state) => state.audio)

  const show = useActiveLightScene((scene) => {
    const m = intermodPropsIncoming(scene)
    return (m.get(index)?.size ?? 0) > 0
  })

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

  if (!show || isAudioShape) {
    return null
  }

  const phaseStored = GetPhase(lfo, time.beats)
  const valueStored = getModulatorLfoValue(lfo, time.beats, audio, index)
  const phaseEff = GetPhase(effectiveLfo, time.beats)
  const valueEff = getModulatorLfoValue(effectiveLfo, time.beats, audio, index)
  const sameSpot =
    Math.abs(phaseStored - phaseEff) < 0.004 &&
    Math.abs(valueStored - valueEff) < 0.004

  if (sameSpot) {
    return null
  }

  const scale = 1 - padding * 2

  return (
    <span
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2,
      }}
    >
      <Cursor
        x={phaseStored * scale + padding}
        y={valueStored * scale + padding}
        color="#ffffff55"
        thickness={1}
        radius={0.32}
        withVertical
      />
    </span>
  )
}
