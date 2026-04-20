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
    audioBandLowHz: defaultBand.lowHz,
    audioBandHighHz: defaultBand.highHz,
    audioThreshold: 0.02,
    audioMax: 0.6,
    audioAttack: 0.35,
    audioDecay: 0.55,
    audioEnergySmoothing: 0.65,
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
    return noiseAtPhase(phaseNormalized, lfo.noiseSeed)
  }

  return 0.0
}

function noiseAtPhase(phaseNormalized: Normalized, noiseSeed: number): Normalized {
  const step = Math.floor(phaseNormalized * NOISE_STEPS_PER_CYCLE)
  const seedOffset = Math.floor(clamp01(noiseSeed) * 10000)
  return hashToUnit(step + 1 + seedOffset * 131)
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
