import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass'
import EffectBase from './EffectBase'
import { FilmConfig } from './effectConfigs'

const cached = new FilmPass()

export class Film extends EffectBase {
  type = 'Film'
  config: FilmConfig
  pass = cached

  constructor(config: FilmConfig) {
    super()
    this.config = config
  }
}
