import { HalftonePass } from 'three/examples/jsm/postprocessing/HalfTonePass'
import { UpdateResource } from '../VisualizerBase'

export interface HalfToneConfig {
  type: 'HalfTone'
}

export function initHalfToneConfig(): HalfToneConfig {
  return { type: 'HalfTone' }
}

// If the effect pass does not maintain internal state between frames, it can be cached and re-used
const cached = new HalftonePass(1, 1, {})

export class HalfTone {
  type = 'HalfTone'
  config: HalfToneConfig
  pass = cached
  // pass = new HalfTonePass  <-- If the effect uses internal state, you need to create a fresh pass with each instantiation

  constructor(config: HalfToneConfig) {
    this.config = config
  }

  update(_dt: number, _res: UpdateResource) {}
}
