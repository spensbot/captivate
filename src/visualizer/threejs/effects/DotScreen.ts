import { DotScreenPass } from 'three/examples/jsm/postprocessing/DotScreenPass'
import EffectBase from './EffectBase'
import { DotScreenConfig } from './effectConfigs'

const cached = new DotScreenPass()

export class DotScreen extends EffectBase {
  type = 'DotScreen'
  config: DotScreenConfig
  pass = cached

  constructor(config: DotScreenConfig) {
    super()
    this.config = config
  }
}
