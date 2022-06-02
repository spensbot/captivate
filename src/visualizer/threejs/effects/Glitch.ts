import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass'
import EffectBase from './EffectBase'
import { GlitchConfig } from './effectConfigs'

const cached = new GlitchPass()

export class Glitch extends EffectBase {
  type = 'Glitch'
  config: GlitchConfig
  pass = cached

  constructor(config: GlitchConfig) {
    super()
    this.config = config
  }
}
