import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { ACESFilmicToneMappingShader } from 'three/examples/jsm/shaders/ACESFilmicToneMappingShader.js'
import EffectBase from './EffectBase'
import { AdaptiveToneMappingConfig } from './effectConfigs'

export class AdaptiveToneMapping extends EffectBase {
  type = 'AdaptiveToneMapping'
  config: AdaptiveToneMappingConfig
  pass: ShaderPass

  constructor(config: AdaptiveToneMappingConfig) {
    super()
    this.config = config
    this.pass = new ShaderPass(ACESFilmicToneMappingShader)
    if (this.pass.uniforms.exposure) {
      this.pass.uniforms.exposure.value = 1
    }
  }
}
