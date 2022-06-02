import { Params, initParams } from './params'
import { Modulator, initModulator } from './modulationEngine'
import { RandomizerOptions, initRandomizerOptions } from '../engine/randomizer'
import { string, number, union, object, boolean, array, equal, map } from '../util/validate'
import { lfoSchema } from './oscillator'

export interface Scene_t {
  name: string,
  bombacity: number,
  modulators: Modulator[],
  baseParams: Params,
  randomizer: RandomizerOptions,
  groups: string[]
}

const paramsSchema = object<Params>({
  Hue: number(),
  Saturation: number(),
  Brightness: number(),
  X: number(),
  Width: number(),
  Y: number(),
  Height: number(),
  Black: number(),
  Epicness: number(),
  Strobe: number(),
  Randomize: number()
})

const modulatorSchema = object<Modulator>({
  lfo: lfoSchema,
  modulation: paramsSchema
})

export const sceneSchema = object<Scene_t>({
  name: string(),
  bombacity: number(),
  modulators: array(modulatorSchema),
  baseParams: paramsSchema,
  randomizer: object({firePeriod: number(), triggersPerFire: number(), riseTime: number(), fallTime: number()}),
  groups: array(string())
})

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