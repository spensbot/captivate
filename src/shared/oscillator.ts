import { Normalized } from '../math/util'
import { skewPower3, skewSymmetric } from '../math/skew'

// const SKEW_FN = skewBezier2
const SKEW_FN = skewPower3
const NOISE_STEPS_PER_CYCLE = 32

export enum LfoShape {
  Sin,
  Ramp,
  Square,
  Saw,
  Noise,
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
    shape <= LfoShape.Noise
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
}

export function GetSin() {
  return {
    shape: LfoShape.Sin,
    skew: 0.5,
    symmetricSkew: 0.5,
    phaseShift: 0.0,
    flip: 0.0,
    period: 4.0,
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
    return Math.sin(phaseNormalized * 2 * Math.PI) / 2 + 0.5
  }

  if (lfo.shape === LfoShape.Ramp) {
    return phaseNormalized
  }

  if (lfo.shape === LfoShape.Square) {
    return phaseNormalized < 0.5 ? 1.0 : 0.0
  }

  if (lfo.shape === LfoShape.Saw) {
    const p = (phaseNormalized + 0.25) % 1.0
    return p < 0.5 ? p * 2.0 : (1.0 - p) * 2.0
  }

  if (lfo.shape === LfoShape.Noise) {
    return noiseAtPhase(phaseNormalized)
  }

  return 0.0
}

function noiseAtPhase(phaseNormalized: Normalized): Normalized {
  const step = Math.floor(phaseNormalized * NOISE_STEPS_PER_CYCLE)
  return hashToUnit(step + 1)
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
