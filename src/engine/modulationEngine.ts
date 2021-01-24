import { Param, ParamKey, Params } from './params'
import { Lfo, GetValue, GetSin, GetRamp } from './oscillator'

export type Modulator = Lfo

export function getInitialModulators(): Modulator[] {
  return [
    GetSin(),
    GetSin()
  ]
}

export function modulateParams(beats: number, modulators: Modulator[], params: Params) {
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