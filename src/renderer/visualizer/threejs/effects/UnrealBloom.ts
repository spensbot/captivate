import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { UpdateResource } from '../VisualizerBase'
import { Vector2 } from 'three'

export interface UnrealBloomConfig {
  type: 'UnrealBloom'
}

export function initUnrealBloomConfig(): UnrealBloomConfig {
  return { type: 'UnrealBloom' }
}

// If the effect pass does not maintain internal state between frames, it can be cached and re-used
const cached = new UnrealBloomPass(new Vector2(1, 1), 0.5, 1, 0.5)

export class UnrealBloom {
  type = 'UnrealBloom'
  config: UnrealBloomConfig
  pass = cached
  // pass = new UnrealBloomPass  <-- If the effect uses internal state, you need to create a fresh pass with each instantiation

  constructor(config: UnrealBloomConfig) {
    this.config = config
  }

  update(_dt: number, _res: UpdateResource) {}
}
