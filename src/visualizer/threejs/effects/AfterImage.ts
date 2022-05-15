import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterImagePass'
import EffectBase from './EffectBase'
import { AfterImageConfig } from './effectConfigs'

export class AfterImage extends EffectBase {
  type = 'AfterImage'
  config: AfterImageConfig
  pass: AfterimagePass

  constructor(config: AfterImageConfig) {
    super()
    this.config = config
    this.pass = new AfterimagePass(config.damp)
  }
}
