import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { LightSyncPass } from '../EffectTypes'
import vertexShader from '../shaders/LightSync.vert'
import fragmentShader from '../shaders/LightSync.frag'
import { Uniform } from 'three'

const LightSyncShader = {
  uniforms: {
    tDiffuse: { value: null },
    opacity: { value: 1.0 },
    brightness: { value: 1.0 },
    offset: new Uniform([0, 0, 0, 0]),
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
