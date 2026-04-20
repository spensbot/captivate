import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { Strobe } from '../util/animations'
import EffectBase from './EffectBase'
import { PixelConfig } from './effectConfigs'
import * as THREE from 'three'

const PixelationShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    resolution: { value: new THREE.Vector2(1, 1) },
    pixelSize: { value: 1 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float pixelSize;
    varying vec2 vUv;
    void main() {
      vec2 dxy = vec2(pixelSize) / resolution;
      vec2 coord = dxy * floor(vUv / dxy);
      gl_FragColor = texture2D(tDiffuse, coord);
    }
  `,
}

export class Pixel extends EffectBase {
  config: PixelConfig
  pass: ShaderPass
  strobe: Strobe

  constructor(config: PixelConfig) {
    super()
    this.config = config
    this.pass = new ShaderPass(PixelationShader)
    this.strobe = new Strobe()
  }

  resize(width: number, height: number): void {
    this.pass.setSize(width, height)
    this.pass.uniforms.resolution.value = new THREE.Vector2(width, height)
    this.pass.uniforms.pixelSize.value = this.config.pixelSize
  }
}
