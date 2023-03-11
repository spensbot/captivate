import { Normalized } from '../math/util'
import { TimeState } from './TimeState'
import { skewPower3 } from '../math/skew'

export type AudioModulator = RmsModulator | PitchModulator | FreqModulator
export type AudioModulatorType = AudioModulator['type']

// Modulate based on current audio volume via root mean square
export interface RmsModulator {
  type: 'RMS'
  skew: Normalized
  channel: 'Left' | 'Center' | 'Right'
}

// Modulate based on dominant pitch in the audio
export interface PitchModulator {
  type: 'Pitch'
  skew: Normalized
  octaves: number
}

// Modulate based on the volume of a frequency bucket
export interface FreqModulator {
  type: 'Freq'
  skew: Normalized
  freq: number
  width: number
}

export function audioModulatorValueIn(
  modulator: AudioModulator,
  timeState: TimeState
): Normalized {
  switch (modulator.type) {
    case 'Freq':
      return 0.0
    case 'Pitch':
      return 0.0
    case 'RMS':
      return timeState.audio.rms
  }
}

export function audioModulatorValueOut(
  valueIn: Normalized,
  skew: Normalized
): Normalized {
  return skewPower3(valueIn, skew)
}

export function audioModulatorValue(
  modulator: AudioModulator,
  timeState: TimeState
): Normalized {
  return skewPower3(audioModulatorValueIn(modulator, timeState), modulator.skew)
}
