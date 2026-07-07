import { Normalized } from '../math/util'
import { skewPower3, skewSymmetric } from '../math/skew'
import { initAudioBandConfig } from './audioEngine'

// const SKEW_FN = skewBezier2
const SKEW_FN = skewPower3
const NOISE_STEPS_PER_CYCLE = 32

export enum LfoShape {
  Sin,
  Ramp,
  Square,
  Saw,
  Noise,
  AudioBand,
  AudioEnergy,
}

export function normalizeLfoShape(shape: unknown): LfoShape {
  if (typeof shape === 'string') {
    const asNumber = Number(shape)
    if (Number.isFinite(asNumber)) {
      shape = asNumber
    } else {
      const byName = (LfoShape as { [key: string]: unknown })[shape]
      if (typeof byName === 'number') {
        return byName as LfoShape
      }
    }
  }

  if (
    typeof shape === 'number' &&
    Number.isInteger(shape) &&
    shape >= LfoShape.Sin &&
    shape <= LfoShape.AudioEnergy
  ) {
    return shape as LfoShape
  }

  return LfoShape.Sin
}

export interface Lfo {
  shape: LfoShape
  skew: Normalized
  symmetricSkew: Normalized
  phaseShift: Normalized
  flip: Normalized
  period: number // beats
  sinePeakWidth: number
  rampCurve: number
  squareDuty: number
  sawFlatten: number
  noiseSeed: number
  /** 0 = stepped noise; 1 = rounded tips and flatter slopes (low-pass + center flatten). */
  noiseSmoothing: number
  audioBandLowHz: number
  audioBandHighHz: number
  audioThreshold: number
  audioMax: number
  audioAttack: number
  audioDecay: number
  audioEnergySmoothing: number
  /** Extra low-pass after attack/decay envelope (audio band LFO only). */
  audioBandSmoothing: number
}

export function GetSin() {
  const defaultBand = initAudioBandConfig()
  return {
    shape: LfoShape.Sin,
    skew: 0.5,
    symmetricSkew: 0.5,
    phaseShift: 0.0,
    flip: 0.0,
    period: 4.0,
    sinePeakWidth: 0.5,
    rampCurve: 0.5,
    squareDuty: 0.5,
    sawFlatten: 0.0,
    noiseSeed: 0.5,
    noiseSmoothing: 0,
    audioBandLowHz: defaultBand.lowHz,
    audioBandHighHz: defaultBand.highHz,
    audioThreshold: 0.02,
    audioMax: 0.6,
    audioAttack: 0.35,
    audioDecay: 0.55,
    audioEnergySmoothing: 0.78,
    audioBandSmoothing: 0,
  }
}

export function GetRamp() {
  const lfo = GetSin()
  lfo.shape = LfoShape.Ramp
  return lfo
}

export function GetValue(lfo: Lfo, beats: number): Normalized {
  const phase = GetPhase(lfo, beats)
  return GetValueFromPhase(lfo, phase)
}

export function GetValueFromPhase(lfo: Lfo, phase: Normalized) {
  const phaseShifted = ShiftPhase(phase, lfo.phaseShift)
  const baseValue = GetValue_base(lfo, phaseShifted)
  return lfo.shape === LfoShape.Sin
    ? Flip(skewSymmetric(baseValue, lfo.skew, SKEW_FN), lfo.flip)
    : Flip(SKEW_FN(baseValue, lfo.skew), lfo.flip)
}

function Flip(value: Normalized, flip: Normalized) {
  value = value - 0.5
  const flipped = -value
  value = flipped * flip + value * (1 - flip)
  return value + 0.5
}

function GetValue_base(lfo: Lfo, phaseNormalized: Normalized): Normalized {
  if (lfo.shape === LfoShape.Sin) {
    const base = Math.sin(phaseNormalized * 2 * Math.PI)
    const peakWidth = clamp01(lfo.sinePeakWidth)
    const exponent = Math.pow(2, (0.5 - peakWidth) * 2)
    const shaped = Math.sign(base) * Math.pow(Math.abs(base), exponent)
    return shaped / 2 + 0.5
  }

  if (lfo.shape === LfoShape.Ramp) {
    const curve = (clamp01(lfo.rampCurve) - 0.5) * 2
    if (Math.abs(curve) <= 0.00001) {
      return phaseNormalized
    }
    const power = 1 + Math.abs(curve) * 3
    return curve > 0
      ? 1 - Math.pow(1 - phaseNormalized, power)
      : Math.pow(phaseNormalized, power)
  }

  if (lfo.shape === LfoShape.Square) {
    const duty = 0.02 + clamp01(lfo.squareDuty) * 0.96
    return phaseNormalized < duty ? 1.0 : 0.0
  }

  if (lfo.shape === LfoShape.Saw) {
    const p = (phaseNormalized + 0.25) % 1.0
    const triangle = p < 0.5 ? p * 2.0 : (1.0 - p) * 2.0
    const flatten = clamp01(lfo.sawFlatten)
    const triangleBipolar = triangle * 2 - 1
    const clipLevel = 1 - flatten * 0.98
    const clipped = Math.max(-clipLevel, Math.min(clipLevel, triangleBipolar))
    const normalized = clipped / Math.max(0.02, clipLevel)
    return normalized * 0.5 + 0.5
  }

  if (lfo.shape === LfoShape.Noise) {
    return noiseAtPhase(
      phaseNormalized,
      lfo.noiseSeed,
      lfo.noiseSmoothing ?? 0
    )
  }

  return 0.0
}

function noiseSampleAtStep(stepIndex: number, noiseSeed: number): Normalized {
  const seedOffset = Math.floor(clamp01(noiseSeed) * 10000)
  const wrapped =
    ((stepIndex % NOISE_STEPS_PER_CYCLE) + NOISE_STEPS_PER_CYCLE) %
    NOISE_STEPS_PER_CYCLE
  return hashToUnit(wrapped + 1 + seedOffset * 131)
}

const NOISE_CYCLE_CACHE_MAX = 48
const noiseCycleCache = new Map<string, Float32Array>()

/** UI 0–1 → internal smoothing; boosts low slider so 0–25% already blends steps. */
function noiseSmoothingStrength(smoothing: number): number {
  const s = clamp01(smoothing)
  if (s <= 0) {
    return 0
  }
  return Math.pow(s, 0.5)
}

function noiseCycleCacheKey(noiseSeed: number, noiseSmoothing: number): string {
  const strength = noiseSmoothingStrength(noiseSmoothing)
  return `${Math.floor(clamp01(noiseSeed) * 10000)}:${strength.toFixed(6)}`
}

function rememberNoiseCycle(key: string, values: Float32Array): Float32Array {
  if (noiseCycleCache.has(key)) {
    noiseCycleCache.delete(key)
  }
  noiseCycleCache.set(key, values)
  while (noiseCycleCache.size > NOISE_CYCLE_CACHE_MAX) {
    const oldest = noiseCycleCache.keys().next().value
    if (oldest === undefined) {
      break
    }
    noiseCycleCache.delete(oldest)
  }
  return values
}

/** Tent-weighted circular blur; radius in sample units (0 = none). */
function circularTentBlur(samples: number[], radius: number): number[] {
  const count = samples.length
  if (count === 0 || radius <= 0.0001) {
    return samples.slice()
  }
  const out = new Array<number>(count)
  const radiusCeil = Math.ceil(radius)
  for (let index = 0; index < count; index++) {
    let weightedSum = 0
    let weightTotal = 0
    for (let offset = -radiusCeil; offset <= radiusCeil; offset++) {
      const distance = Math.abs(offset)
      if (distance > radius + 0.0001) {
        continue
      }
      const weight = Math.max(0, 1 - distance / (radius + 0.5))
      const wrapped =
        ((index + offset) % count + count) % count
      weightedSum += samples[wrapped] * weight
      weightTotal += weight
    }
    out[index] = weightTotal > 0 ? weightedSum / weightTotal : samples[index]
  }
  return out
}

/**
 * Rounds peak/valley tips (tanh soft-knee) and flattens small excursions near 0.5
 * more than large swings.
 */
function shapeNoiseAmplitude(value: number, smoothing: number): number {
  const smooth = clamp01(smoothing)
  const delta = value - 0.5
  const absDelta = Math.abs(delta)
  const knee = 2 + (1 - smooth) * 14
  const kneeDenom = 2 * Math.tanh(knee * 0.5)
  let shaped = 0.5 + Math.tanh(delta * knee) / kneeDenom
  const nearMid = Math.max(0, 1 - absDelta * 2)
  const midFlatten = smooth * nearMid * nearMid
  shaped += (0.5 - shaped) * midFlatten
  return clamp01(shaped)
}

function buildSmoothedNoiseCycle(
  noiseSeed: number,
  noiseSmoothing: number
): Float32Array {
  const strength = noiseSmoothingStrength(noiseSmoothing)
  const count = NOISE_STEPS_PER_CYCLE
  const raw = new Array<number>(count)
  for (let index = 0; index < count; index++) {
    raw[index] = noiseSampleAtStep(index, noiseSeed)
  }

  const blurRadius = 0.35 + strength * 9.65
  let values = circularTentBlur(raw, blurRadius)

  for (let index = 0; index < count; index++) {
    values[index] = shapeNoiseAmplitude(values[index], strength)
  }

  const secondBlur = strength * 5.5
  if (secondBlur > 0.0001) {
    values = circularTentBlur(values, secondBlur)
  }

  return new Float32Array(values)
}

function smoothedNoiseCycle(
  noiseSeed: number,
  noiseSmoothing: number
): Float32Array {
  const key = noiseCycleCacheKey(noiseSeed, noiseSmoothing)
  const cached = noiseCycleCache.get(key)
  if (cached !== undefined) {
    return cached
  }
  return rememberNoiseCycle(
    key,
    buildSmoothedNoiseCycle(noiseSeed, noiseSmoothing)
  )
}

function noiseSmoothstep(edge0: number, edge1: number, x: number): number {
  const span = Math.max(1e-6, edge1 - edge0)
  const t = clamp01((x - edge0) / span)
  return t * t * (3 - 2 * t)
}

function noiseAtPhase(
  phaseNormalized: Normalized,
  noiseSeed: number,
  noiseSmoothing: number
): Normalized {
  const smoothing = clamp01(noiseSmoothing)
  const phaseSteps = clamp01(phaseNormalized) * NOISE_STEPS_PER_CYCLE
  const stepIndex = Math.floor(phaseSteps) % NOISE_STEPS_PER_CYCLE
  const stepped = noiseSampleAtStep(stepIndex, noiseSeed)

  if (smoothing <= 0) {
    return stepped
  }

  const cycle = smoothedNoiseCycle(noiseSeed, smoothing)
  const count = NOISE_STEPS_PER_CYCLE
  const index0 = Math.floor(phaseSteps) % count
  const frac = phaseSteps - Math.floor(phaseSteps)
  const index1 = (index0 + 1) % count
  const v0 = cycle[index0]
  const v1 = cycle[index1]
  const t = frac * frac * (3 - 2 * frac)
  const interpolated = clamp01(v0 + (v1 - v0) * t)

  // Ease off stepped holds at the bottom of the slider (no pop at first tick above 0).
  const wet = noiseSmoothstep(0, 0.12, smoothing)
  return clamp01(stepped * (1 - wet) + interpolated * wet)
}

function hashToUnit(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

function ShiftPhase(phase: Normalized, phaseShift: Normalized) {
  return (phase + phaseShift) % 1.0
}

export function GetPhase(lfo: Lfo, beats: number) {
  return (beats % lfo.period) / lfo.period
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}
