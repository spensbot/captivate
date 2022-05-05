import { AdaptiveToneMappingPass } from 'three/examples/jsm/postprocessing/AdaptiveToneMappingPass'
import EffectBase from './EffectBase'
import { AdaptiveToneMappingConfig } from './effectConfigs'

const cached = new AdaptiveToneMappingPass()

export class AdaptiveToneMapping extends EffectBase {
  type = 'AdaptiveToneMapping'
  config: AdaptiveToneMappingConfig
  pass = cached

  constructor(config: AdaptiveToneMappingConfig) {
    super()
    this.config = config
  }
}
