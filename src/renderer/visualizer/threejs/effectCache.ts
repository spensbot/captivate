import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js'
import { EffectType } from './EffectTypes'
import { Pass } from 'three/examples/jsm/postprocessing/Pass'

const effectCache: { [key in EffectType]: Pass } = {
  glitch: new GlitchPass(),
}

export default effectCache
