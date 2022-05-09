import { HalftonePass } from 'three/examples/jsm/postprocessing/HalfTonePass'
import EffectBase from './EffectBase'
import { HalfToneConfig } from './effectConfigs'

const cached = new HalftonePass(1, 1, {})

export class HalfTone extends EffectBase {
  type = 'HalfTone'
  config: HalfToneConfig
  pass = cached

  constructor(config: HalfToneConfig) {
    super()
    this.config = config
  }
}
