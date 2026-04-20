import { useMemo, useRef } from 'react'
import { GetValueFromPhase } from '../../shared/oscillator'
import { useDispatch } from 'react-redux'
import useDragBasic from '../hooks/useDragBasic'
import { incrementModulator } from '../redux/controlSlice'
import { useActiveLightScene } from '../redux/store'
import { secondaryEnabled } from 'renderer/base/keyUtil'
import { useRealtimeSelector } from '../redux/realtimeStore'
import { getModulatorLfoValue } from '../../shared/modulation'
import { LfoShape } from '../../shared/oscillator'

type Props = {
  index: number
  width: number
  height: number
  padding: number
}

const stepSize = 2
const lineWidth = 2
const backgroundColor = '#000000'
const lineColor = '#3333ff'
const audioWaveColor = '#ffd77a'
const audioGridColor = '#ffffff22'
const AUDIO_HISTORY_BEATS = 16

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export default function LfoVisualizer({
  index,
  width,
  height,
  padding,
}: Props) {
  const xPadding = width * padding
  const yPadding = height * padding
  const width_ = width - xPadding * 2
  const height_ = height - yPadding * 2

  const dispatch = useDispatch()

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
  const time = useRealtimeSelector((state) => state.time)
  const audio = useRealtimeSelector((state) => state.audio)
  const isAudioShape =
    modulator.lfo.shape === LfoShape.AudioBand ||
    modulator.lfo.shape === LfoShape.AudioEnergy
  const audioValue = getModulatorLfoValue(modulator.lfo, time.beats, audio)
  const audioHistoryRef = useRef<Array<{ beat: number; value: number }>>([])

  function GetPoints() {
    const zeros = Array(width_ / stepSize + 1).fill(0)

    const pointsArray = zeros.map((_, i) => {
      const x = (i * stepSize) / width_
      const y = 1 - GetValueFromPhase(modulator.lfo, x)
      return [x * width_ + xPadding, y * height_ + yPadding]
    })

    const points = pointsArray.reduce((accum, point) => {
      return accum + `${point[0]},${point[1]}` + ' '
    }, '')

    return points
  }

  const audioWavePoints = useMemo(() => {
    if (!isAudioShape) {
      audioHistoryRef.current = []
      return ''
    }

    const history = audioHistoryRef.current
    const currentBeat = Number.isFinite(time.beats) ? time.beats : 0
    const lastSample = history[history.length - 1]
    if (lastSample !== undefined && currentBeat < lastSample.beat - 0.001) {
      history.length = 0
    }
    history.push({
      beat: currentBeat,
      value: clamp01(audioValue),
    })

    const minBeat = currentBeat - AUDIO_HISTORY_BEATS
    while (history.length > 0 && history[0].beat < minBeat) {
      history.shift()
    }

    if (history.length <= 1) {
      return ''
    }

    return history
      .map((sample) => {
        const phase = clamp01((sample.beat - minBeat) / AUDIO_HISTORY_BEATS)
        const x = xPadding + phase * width_
        const y = yPadding + (1 - sample.value) * height_
        return `${x},${y}`
      })
      .join(' ')
  }, [audioValue, height_, isAudioShape, time.beats, width_, xPadding, yPadding])

  return (
    <div
      ref={dragContainer}
      onMouseDown={onMouseDown}
      style={{
        width: width,
        height: height,
        backgroundColor: backgroundColor,
        position: 'relative',
      }}
    >
      <svg height={height} width={width}>
        {isAudioShape && (
          <>
            <line
              x1={xPadding}
              y1={yPadding + height_ * 0.25}
              x2={width - xPadding}
              y2={yPadding + height_ * 0.25}
              stroke={audioGridColor}
              strokeWidth={1}
            />
            <line
              x1={xPadding}
              y1={yPadding + height_ * 0.5}
              x2={width - xPadding}
              y2={yPadding + height_ * 0.5}
              stroke={audioGridColor}
              strokeWidth={1}
            />
            <line
              x1={xPadding}
              y1={yPadding + height_ * 0.75}
              x2={width - xPadding}
              y2={yPadding + height_ * 0.75}
              stroke={audioGridColor}
              strokeWidth={1}
            />
          </>
        )}
        <polyline
          points={
            isAudioShape
              ? audioWavePoints
              : GetPoints()
          }
          style={{
            fill: 'none',
            stroke: isAudioShape ? audioWaveColor : lineColor,
            strokeWidth: lineWidth,
          }}
        />
        {isAudioShape && (
          <rect
            x={xPadding}
            y={(1 - audioValue) * height_ + yPadding}
            width={width_}
            height={height - ((1 - audioValue) * height_ + yPadding)}
            fill="#ffcf6633"
          />
        )}
      </svg>
    </div>
  )
}
