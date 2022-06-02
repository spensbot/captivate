import { AdaptiveToneMappingPass } from 'three/examples/jsm/postprocessing/AdaptiveToneMappingPass'
import EffectBase from './EffectBase'
import { AdaptiveToneMappingConfig } from './effectConfigs'

export class AdaptiveToneMapping extends EffectBase {
  type = 'AdaptiveToneMapping'
  config: AdaptiveToneMappingConfig
  pass: AdaptiveToneMappingPass

  constructor(config: AdaptiveToneMappingConfig) {
    super()
    this.config = config
    this.pass = new AdaptiveToneMappingPass(false)
  }
}
