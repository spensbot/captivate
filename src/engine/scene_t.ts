import { Params, initParams } from './params'
import { Modulator, initModulator } from './modulationEngine'

export interface Scene_t {
  name: string,
  bombacity: number,
  modulators: Modulator[],
  baseParams: Params
}

export function initScene(): Scene_t {
  return {
    name: '',
    bombacity: 0,
    modulators: [initModulator()],
    baseParams: initParams()
  }
}