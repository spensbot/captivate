import { AdaptiveToneMappingPass } from 'three/examples/jsm/postprocessing/AdaptiveToneMappingPass'
import { UpdateResource } from '../VisualizerBase'

export interface AdaptiveToneMappingConfig {
  type: 'AdaptiveToneMapping'
}

export function initAdaptiveToneMappingConfig(): AdaptiveToneMappingConfig {
  return { type: 'AdaptiveToneMapping' }
}

// If the effect pass does not maintain internal state between frames, it can be cached and re-used
const cached = new AdaptiveToneMappingPass()

export class AdaptiveToneMapping {
  type = 'AdaptiveToneMapping'
  config: AdaptiveToneMappingConfig
  pass = cached
  // pass = new AdaptiveToneMappingPass  <-- If the effect uses internal state, you need to create a fresh pass with each instantiation

  constructor(config: AdaptiveToneMappingConfig) {
    this.config = config
  }

  update(_dt: number, _res: UpdateResource) {}
}
