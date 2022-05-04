import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass'

export interface GlitchConfig {
  type: 'Glitch'
}

export function initGlitchConfig(): GlitchConfig {
  return { type: 'Glitch' }
}

const cached = new GlitchPass()

export class Glitch {
  type = 'Glitch'
  config: GlitchConfig
  pass = cached

  constructor(config: GlitchConfig) {
    this.config = config
  }

  update() {}
}
