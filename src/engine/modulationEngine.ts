import { Params, initModulation, initParams, paramsList, ParamKey } from './params'
import { Lfo, GetValue, GetRamp } from './oscillator'
import { Scene_t } from './scene_t'
import { clampNormalized } from '../util/helpers'

export interface Modulator {
  lfo: Lfo,
  modulation: Params
}

export function initModulator() {
  return {
    lfo: GetRamp(),
    modulation: initModulation()
  }
}

export function modulateParams(beats: number, scene: Scene_t) {
  const modulatedParams: Params = {...scene.baseParams}
  
  const modValues = scene.modulators.map(modulator => {
    return GetValue(modulator.lfo, beats)
  })

  paramsList.forEach(paramKey => {
    modulatedParams[paramKey] = modulateParam(scene.baseParams[paramKey], scene.modulators, modValues, paramKey)
  })

  return modulatedParams
}

function modulateParam(baseParam: number, modulators: Modulator[], modValues: number[], paramKey: ParamKey) {
  return clampNormalized(modulators.reduce((sum: number, modulator, index) => {
    const modAmountMapped = modulator.modulation[paramKey] * 2 - 1 // from -1 to 1
    const modValueMapped = modValues[index] * 2 - 1 // from -1 to 1
    const addedModulation = modAmountMapped * modValueMapped / 2 // from -0.5 to -0.5

    return sum + addedModulation
  }, baseParam))
}