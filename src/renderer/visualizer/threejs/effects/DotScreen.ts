import { DotScreenPass } from 'three/examples/jsm/postprocessing/DotScreenPass'
import { UpdateResource } from '../VisualizerBase'

export interface DotScreenConfig {
  type: 'DotScreen'
}

export function initDotScreenConfig(): DotScreenConfig {
  return { type: 'DotScreen' }
}

// If the effect pass does not maintain internal state between frames, it can be cached and re-used
const cached = new DotScreenPass()

export class DotScreen {
  type = 'DotScreen'
  config: DotScreenConfig
  pass = cached
  // pass = new DotScreenPass  <-- If the effect uses internal state, you need to create a fresh pass with each instantiation

  constructor(config: DotScreenConfig) {
    this.config = config
  }

  update(_dt: number, _res: UpdateResource) {}
}
