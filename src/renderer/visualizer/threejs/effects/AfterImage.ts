import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterImagePass'
import { UpdateResource } from '../VisualizerBase'

export interface AfterImageConfig {
  type: 'AfterImage'
}

export function initAfterImageConfig(): AfterImageConfig {
  return { type: 'AfterImage' }
}

export class AfterImage {
  type = 'AfterImage'
  config: AfterImageConfig
  pass = new AfterimagePass()

  constructor(config: AfterImageConfig) {
    this.config = config
  }

  update(_dt: number, _res: UpdateResource) {}
}
