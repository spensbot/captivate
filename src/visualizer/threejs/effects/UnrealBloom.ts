import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { Vector2 } from 'three'
import EffectBase from './EffectBase'
import { UnrealBloomConfig } from './effectConfigs'

const cached = new UnrealBloomPass(new Vector2(1, 1), 0.5, 1, 0.5)

export class UnrealBloom extends EffectBase {
  type = 'UnrealBloom'
  config: UnrealBloomConfig
  pass = cached

  constructor(config: UnrealBloomConfig) {
    super()
    this.config = config
  }
}
