import { ___Pass } from 'three/examples/jsm/postprocessing/___Pass'
import { UpdateResource } from '../LayerBase'

export interface ___Config {
  type: '___'
}

export function init___Config(): ___Config {
  return { type: '___' }
}

// If the effect pass does not maintain internal state between frames, it can be cached and re-used
const cached = new ___Pass()

export class ___ {
  type = '___'
  config: ___Config
  pass = cached
  // pass = new ___Pass  <-- If the effect uses internal state, you need to create a fresh pass with each instantiation

  constructor(config: ___Config) {
    this.config = config
  }

  update(_dt: number, _res: UpdateResource) {}
}
