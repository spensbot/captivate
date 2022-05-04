import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass'
import { UpdateResource } from '../VisualizerBase'

export interface GlitchConfig {
  type: 'Glitch'
}

export function initGlitchConfig(): GlitchConfig {
  return { type: 'Glitch' }
}

// If the effect pass does not maintain internal state between frames, it can be cached and re-used
const cached = new GlitchPass()

export class Glitch {
  type = 'Glitch'
  config: GlitchConfig
  pass = cached
  // pass = new GlitchPass  <-- If the effect uses internal state, you need to create a fresh pass with each instantiation

  constructor(config: GlitchConfig) {
    this.config = config
  }

  update(_dt: number, _res: UpdateResource) {}
}
