import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { LightSyncPass } from '../EffectTypes'
import LightSyncShader from './LightSyncShader'

export default class {
  pass: ShaderPass

  constructor(_config: LightSyncPass) {
    this.pass = new ShaderPass(LightSyncShader)
  }
}
