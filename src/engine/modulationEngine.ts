import { Params } from './params'
import { Lfo, GetValue } from './oscillator'

export function modulateParams(beats: number, modulators: Lfo[], params: Params) {
  const newParams: Params = {}

  for (let [key, value] of Object.entries(params)) {
    const outValue = value.modulator === undefined ? value.baseValue : GetValue(modulators[value.modulator], beats)

    newParams[key] = {
      baseValue: value.baseValue,
      modulator: value.modulator,
      value: outValue
    }
  }

  return newParams
}