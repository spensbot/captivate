import { Params, initParams } from './params'
import { Modulator, initModulator } from './modulationEngine'

export interface Scene_t {
  modulators: Modulator[],
  baseParams: Params
}

export const initScene = () => ({
  modulators: [initModulator()],
  baseParams: initParams()
})