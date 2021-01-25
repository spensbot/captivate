import { Params, ParamsModulation } from './params'
import { Lfo, GetValue } from './oscillator'

export function modulateParams(beats: number, modulators: Lfo[], params: Params, modulation: ParamsModulation) {
  const modulatedParams: Params = {}

  for (let [param, baseValue] of Object.entries(params)) {
    const modulatorIndex = modulation[param]
    modulatedParams[param] = (modulatorIndex === null)
      ? baseValue
      : GetValue(modulators[modulatorIndex], beats)
  }

  return modulatedParams
}