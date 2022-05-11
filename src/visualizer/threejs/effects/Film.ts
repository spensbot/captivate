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
      config.intensity,
      config.intensity,
      config.scanlines,
      config.grayscale ? 1 : 0
    )
    this.config = config
  }
}
