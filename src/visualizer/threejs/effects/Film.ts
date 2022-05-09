import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass'
import EffectBase from './EffectBase'
import { FilmConfig } from './effectConfigs'

export class Film extends EffectBase {
  type = 'Film'
  config: FilmConfig
  pass: FilmPass

  constructor(config: FilmConfig) {
    super()
    this.pass = new FilmPass(
      config.noiseIntensity,
      config.scanlinesIntensity,
      config.scanlinesCount,
      config.grayscale
    )
    this.config = config
  }
}
