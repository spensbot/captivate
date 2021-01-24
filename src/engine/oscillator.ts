import { Normalized } from "../types/baseTypes";

export enum LfoShape {
  Sin,
  Ramp,
  Random
}

export interface Lfo {
  shape: LfoShape
  skew: number
  symmetricSkew: number
  phaseShift: Normalized
  flip: Normalized
  period: number // beats
}

export function GetSin() {
  return {
    shape: LfoShape.Sin,
    skew: 1.0,
    symmetricSkew: 1.0,
    phaseShift: 0.0,
    flip: 0.0,
    period: 4.0
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
  return Flip(Skew(SymmetricSkew(baseValue, lfo.symmetricSkew), lfo.skew), lfo.flip)
}

function Skew(value: Normalized, skew: number) {
  return Math.pow(value, skew)
}

function SymmetricSkew(value: Normalized, skew: number) {
  let output = value * 2.0 - 1.0
  if (output > 0) {
    output = Skew(output, skew)
  } else {
    output = -Math.pow(-output, skew)
  }
  return (output + 1) / 2
}

function Flip(value: Normalized, flip: number) {
  value = value - 0.5
  const flipped = -value
  value = flipped * flip + value * (1 - flip)
  return value + 0.5
}

function GetValue_base(lfo: Lfo, phaseNormalized: Normalized): Normalized {
  if (lfo.shape == LfoShape.Sin)
    return Math.sin(phaseNormalized * 2 * Math.PI) / 2 + 0.5
  else if (lfo.shape == LfoShape.Ramp)
    return phaseNormalized
  else 
    return 0.0
}

function ShiftPhase(phase: Normalized, phaseShift: Normalized) {
  return (phase + phaseShift) % 1.0
}

function GetPhase(lfo: Lfo, beats: number) {
  return (beats % lfo.period) / lfo.period
}