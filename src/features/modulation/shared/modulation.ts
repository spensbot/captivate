import { Modulation } from '../../params/shared/params'
import { Lfo, GetRamp } from './oscillator'

export interface Modulator {
  lfo: Lfo
  splitModulations: Modulation[]
}

export function initModulation(): Modulation {
  return {}
}

export function initModulator(splitCount: number): Modulator {
  return {
    lfo: GetRamp(),
    splitModulations: Array(splitCount)
      .fill(0)
      .map(() => initModulation()),
  }
}
