import type { Lfo } from '../../shared/oscillator'
import { GetValueFromPhase } from '../../shared/oscillator'

export const LFO_VIS_STEP_SIZE = 2
export const LFO_VIS_LINE_WIDTH = 2
export const LFO_VIS_BACKGROUND = '#000000'
export const LFO_VIS_LINE_COLOR = '#3333ff'
export const LFO_VIS_AUDIO_WAVE_COLOR = '#ffd77a'
export const LFO_VIS_AUDIO_GRID_COLOR = '#ffffff22'
export const LFO_VIS_AUDIO_FILL_COLOR = '#ffcf6633'
export const LFO_VIS_AUDIO_HISTORY_BEATS = 16

export type AudioHistorySample = { beat: number; value: number }

export function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function buildWaveSamples(
  lfo: Lfo,
  plotWidth: number,
  stepSize: number = LFO_VIS_STEP_SIZE
): Float32Array {
  const count = Math.max(2, Math.floor(plotWidth / stepSize) + 1)
  const samples = new Float32Array(count * 2)
  for (let i = 0; i < count; i++) {
    const phase = (i * stepSize) / plotWidth
    samples[i * 2] = phase
    samples[i * 2 + 1] = 1 - GetValueFromPhase(lfo, phase)
  }
  return samples
}

export function prepareCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext('2d')
  if (ctx === null) {
    return null
  }

  const dpr = window.devicePixelRatio || 1
  const pixelWidth = Math.max(1, Math.round(width * dpr))
  const pixelHeight = Math.max(1, Math.round(height * dpr))
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth
    canvas.height = pixelHeight
  }
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return ctx
}

export function drawWaveLine(
  ctx: CanvasRenderingContext2D,
  samples: Float32Array,
  xPadding: number,
  yPadding: number,
  plotWidth: number,
  plotHeight: number,
  color: string,
  lineWidth: number = LFO_VIS_LINE_WIDTH
) {
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.lineJoin = 'round'
  ctx.beginPath()
  const pointCount = samples.length / 2
  for (let i = 0; i < pointCount; i++) {
    const x = xPadding + samples[i * 2] * plotWidth
    const y = yPadding + samples[i * 2 + 1] * plotHeight
    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }
  ctx.stroke()
}

export function drawAudioGrid(
  ctx: CanvasRenderingContext2D,
  xPadding: number,
  yPadding: number,
  plotHeight: number,
  rightEdge: number,
  color: string = LFO_VIS_AUDIO_GRID_COLOR
) {
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  for (const fraction of [0.25, 0.5, 0.75]) {
    const y = yPadding + plotHeight * fraction
    ctx.beginPath()
    ctx.moveTo(xPadding, y)
    ctx.lineTo(rightEdge, y)
    ctx.stroke()
  }
}

export function appendAudioHistorySample(
  history: AudioHistorySample[],
  beat: number,
  value: number,
  historyBeats: number = LFO_VIS_AUDIO_HISTORY_BEATS
): number {
  const currentBeat = Number.isFinite(beat) ? beat : 0
  const lastSample = history[history.length - 1]
  if (lastSample !== undefined && currentBeat < lastSample.beat - 0.001) {
    history.length = 0
  }
  history.push({
    beat: currentBeat,
    value: clamp01(value),
  })

  const minBeat = currentBeat - historyBeats
  while (history.length > 0 && history[0].beat < minBeat) {
    history.shift()
  }
  return minBeat
}

export function drawAudioHistoryLine(
  ctx: CanvasRenderingContext2D,
  history: AudioHistorySample[],
  minBeat: number,
  xPadding: number,
  yPadding: number,
  plotWidth: number,
  plotHeight: number,
  historyBeats: number = LFO_VIS_AUDIO_HISTORY_BEATS,
  color: string = LFO_VIS_AUDIO_WAVE_COLOR,
  lineWidth: number = LFO_VIS_LINE_WIDTH
) {
  if (history.length <= 1) {
    return
  }

  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.lineJoin = 'round'
  ctx.beginPath()
  history.forEach((sample, index) => {
    const phase = clamp01((sample.beat - minBeat) / historyBeats)
    const x = xPadding + phase * plotWidth
    const y = yPadding + (1 - sample.value) * plotHeight
    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })
  ctx.stroke()
}

export function drawAudioLevelFill(
  ctx: CanvasRenderingContext2D,
  audioValue: number,
  xPadding: number,
  yPadding: number,
  plotWidth: number,
  plotHeight: number,
  canvasHeight: number,
  color: string = LFO_VIS_AUDIO_FILL_COLOR
) {
  const levelY = yPadding + (1 - clamp01(audioValue)) * plotHeight
  ctx.fillStyle = color
  ctx.fillRect(xPadding, levelY, plotWidth, canvasHeight - levelY)
}

export function paintLfoVisualizerFrame(options: {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  xPadding: number
  yPadding: number
  plotWidth: number
  plotHeight: number
  isAudioShape: boolean
  waveSamples: Float32Array | null
  beats: number
  audioValue: number
  audioHistory: AudioHistorySample[]
}) {
  const {
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
    audioHistory,
  } = options

  ctx.fillStyle = LFO_VIS_BACKGROUND
  ctx.fillRect(0, 0, width, height)

  if (isAudioShape) {
    drawAudioGrid(
      ctx,
      xPadding,
      yPadding,
      plotHeight,
      width - xPadding
    )
    const minBeat = appendAudioHistorySample(audioHistory, beats, audioValue)
    drawAudioHistoryLine(
      ctx,
      audioHistory,
      minBeat,
      xPadding,
      yPadding,
      plotWidth,
      plotHeight
    )
    drawAudioLevelFill(
      ctx,
      audioValue,
      xPadding,
      yPadding,
      plotWidth,
      plotHeight,
      height
    )
    return
  }

  if (waveSamples !== null) {
    drawWaveLine(
      ctx,
      waveSamples,
      xPadding,
      yPadding,
      plotWidth,
      plotHeight,
      LFO_VIS_LINE_COLOR
    )
  }
}
