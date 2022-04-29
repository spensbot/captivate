import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { LightSyncPass } from '../EffectTypes'
import vertexShader from '../shaders/LightSync.vert'
import fragmentShader from '../shaders/LightSync.frag'

const LightSyncShader = {
  uniforms: {
    tDiffuse: { value: null },
    opacity: { value: 1.0 },
    brightness: { value: 0.5 },
  },
  vertexShader,
  fragmentShader,
}

export default class {
  pass: ShaderPass

  constructor(_config: LightSyncPass) {
    this.pass = new ShaderPass(LightSyncShader)
  }
}
