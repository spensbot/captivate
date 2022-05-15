import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { Vector2 } from 'three'
import EffectBase from './EffectBase'
import { UnrealBloomConfig } from './effectConfigs'

export class UnrealBloom extends EffectBase {
  type = 'UnrealBloom'
  config: UnrealBloomConfig
  pass: UnrealBloomPass

  constructor(config: UnrealBloomConfig) {
    super()
    this.config = config
    this.pass = new UnrealBloomPass(
      new Vector2(1, 1),
      config.strength,
      config.radius,
      config.threshold
    )
  }
}
