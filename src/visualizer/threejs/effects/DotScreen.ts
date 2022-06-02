import { Vector2 } from 'three'
import { DotScreenPass } from 'three/examples/jsm/postprocessing/DotScreenPass'
import EffectBase from './EffectBase'
import { DotScreenConfig } from './effectConfigs'

export class DotScreen extends EffectBase {
  type = 'DotScreen'
  config: DotScreenConfig
  pass: DotScreenPass

  constructor(config: DotScreenConfig) {
    super()
    this.config = config
    this.pass = new DotScreenPass(
      new Vector2(config.centerX, config.centerY),
      config.angle,
      1 - config.scale
    )
  }
}
