import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { Strobe } from '../util/animations'
import EffectBase from './EffectBase'
import { PixelConfig } from './effectConfigs'
import { PixelShader } from 'three/examples/jsm/shaders/PixelShader'
import * as THREE from 'three'

export class Pixel extends EffectBase {
  config: PixelConfig
  pass: ShaderPass
  strobe: Strobe

  constructor(config: PixelConfig) {
    super()
    this.config = config
    this.pass = new ShaderPass(PixelShader)
    this.strobe = new Strobe()
  }

  resize(width: number, height: number): void {
    this.pass.setSize(width, height)
    this.pass.uniforms.resolution.value = new THREE.Vector2(width, height)
    this.pass.uniforms.pixelSize.value = this.config.pixelSize
  }
}
