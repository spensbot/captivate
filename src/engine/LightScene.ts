import { Params, initParams } from './params'
import { Modulator, initModulator } from './modulation'
import { RandomizerOptions, initRandomizerOptions } from './randomizer'

export interface LightScene_t {
  name: string
  bombacity: number
  modulators: Modulator[]
  baseParams: Params
  randomizer: RandomizerOptions
  groups: string[]
}

export function initLightScene(): LightScene_t {
  return {
    name: 'Name',
    bombacity: 0,
    modulators: [initModulator()],
    baseParams: initParams(),
    randomizer: initRandomizerOptions(),
    groups: [],
  }
}
