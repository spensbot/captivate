import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass'
import EffectBase from './EffectBase'
import { FilmConfig } from './effectConfigs'

export class Film extends EffectBase {
  type = 'Film'
  config: FilmConfig
  pass: FilmPass

  constructor(config: FilmConfig) {
    super()
    this.pass = new FilmPass(config.intensity, config.grayscale)
    const uniforms = this.pass.uniforms as Record<string, { value: unknown }>
    if (uniforms.sCount) {
      uniforms.sCount.value = config.scanlines
    }
    this.config = config
  }
}
