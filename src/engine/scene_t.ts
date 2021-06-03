import { Params, initParams } from './params'
import { Modulator, initModulator } from './modulationEngine'
import { RandomizerOptions, initRandomizerOptions } from '../engine/randomizer'

export interface Scene_t {
  name: string,
  bombacity: number,
  modulators: Modulator[],
  baseParams: Params,
  randomizer: RandomizerOptions,
  groups: string[]
}

export function initScene(): Scene_t {
  return {
    name: '',
    bombacity: 0,
    modulators: [initModulator()],
    baseParams: initParams(),
    randomizer: initRandomizerOptions(),
    groups: []
  }
}