import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass'
import EffectBase from './EffectBase'
import { AfterImageConfig } from './effectConfigs'
import { mapFn } from '../../../shared/util'

const mapDamp = mapFn(0.3)

export class AfterImage extends EffectBase {
  type = 'AfterImage'
  config: AfterImageConfig
  pass: AfterimagePass

  constructor(config: AfterImageConfig) {
    super()
    this.config = config
    const damp = mapDamp(config.damp)
    this.pass = new AfterimagePass(damp)
  }
}
