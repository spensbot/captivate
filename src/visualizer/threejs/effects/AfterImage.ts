import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterImagePass'
import EffectBase from './EffectBase'
import { AfterImageConfig } from './effectConfigs'

export class AfterImage extends EffectBase {
  type = 'AfterImage'
  config: AfterImageConfig
  pass = new AfterimagePass()

  constructor(config: AfterImageConfig) {
    super()
    this.config = config
  }
}
