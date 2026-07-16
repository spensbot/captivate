import { memo, useLayoutEffect, useMemo, useRef } from 'react'
import { useDispatch } from 'react-redux'
import useDragBasic from '../hooks/useDragBasic'
import { incrementModulator } from '../redux/controlSlice'
import { useActiveLightScene } from '../redux/store'
import { secondaryEnabled } from 'renderer/base/keyUtil'
import { useLfoAudioMetrics, useLfoBeats } from '../redux/realtimeSelectors'
import { effectiveLfosAtSplit, getModulatorLfoValue } from '../../shared/modulation'
import { LfoShape } from '../../shared/oscillator'
import { useModPreviewSplit } from './useModPreviewSplit'
import {
  buildWaveSamples,
  LFO_VIS_BACKGROUND,
  type AudioHistorySample,
  paintLfoVisualizerFrame,
  prepareCanvas,
} from './lfoVisualizerCanvas'

type Props = {
  index: number
  width: number
  height: number
  padding: number
}

function LfoVisualizer({
  index,
  width,
  height,
  padding,
}: Props) {
  const xPadding = width * padding
  const yPadding = height * padding
  const plotWidth = width - xPadding * 2
  const plotHeight = height - yPadding * 2

  const dispatch = useDispatch()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioHistoryRef = useRef<AudioHistorySample[]>([])

  const [dragContainer, onMouseDown] = useDragBasic((e) => {
    const dx = -e.movementX / width
    const dy = e.movementY / height
    const se = secondaryEnabled(e)
    dispatch(
      incrementModulator({
        index: index,
        phaseShift: se ? 0 : dx,
        flip: se ? 0 : dy,
        symmetricSkew: se ? dx : 0,
        skew: se ? dy : 0,
      })
    )
  })

  const modulator = useActiveLightScene(
    (activeScene) => activeScene.modulators[index]
  )
  const lightScene = useActiveLightScene((s) => s)
  const splitIx = useModPreviewSplit()
  const beats = useLfoBeats()
  const audio = useLfoAudioMetrics()
  const effectiveLfo = useMemo(() => {
    const lfos = effectiveLfosAtSplit(
      lightScene,
      splitIx,
      beats,
      audio
    )
    return lfos[index] ?? modulator.lfo
  }, [lightScene, splitIx, beats, audio, index, modulator.lfo])
  const isAudioShape =
    modulator.lfo.shape === LfoShape.AudioBand ||
    modulator.lfo.shape === LfoShape.AudioEnergy
  const audioValue = getModulatorLfoValue(effectiveLfo, beats, audio, index, {
    splitIndex: splitIx,
  })

  const waveSamples = useMemo(() => {
    if (isAudioShape || plotWidth <= 0 || plotHeight <= 0) {
      return null
    }
    return buildWaveSamples(effectiveLfo, plotWidth)
  }, [effectiveLfo, isAudioShape, plotWidth, plotHeight])

  useLayoutEffect(() => {
    if (!isAudioShape) {
      audioHistoryRef.current = []
    }
  }, [isAudioShape])

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (canvas === null) {
      return
    }

    const ctx = prepareCanvas(canvas, width, height)
    if (ctx === null) {
      return
    }

    paintLfoVisualizerFrame({
      ctx,
      width,
      height,
      xPadding,
      yPadding,
      plotWidth,
      plotHeight,
      isAudioShape,
      waveSamples,
      beats,
      audioValue,
      audioHistory: audioHistoryRef.current,
    })
  }, [
    audioValue,
    beats,
    height,
    isAudioShape,
    plotHeight,
    plotWidth,
    waveSamples,
    width,
    xPadding,
    yPadding,
  ])

  return (
    <div
      ref={dragContainer}
      onMouseDown={onMouseDown}
      title="Drag: sideways = timing, up/down = flip. Ctrl/Cmd+drag = skew (or use the Skew slider)."
      style={{
        width: width,
        height: height,
        backgroundColor: LFO_VIS_BACKGROUND,
        position: 'relative',
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

export default memo(LfoVisualizer)
