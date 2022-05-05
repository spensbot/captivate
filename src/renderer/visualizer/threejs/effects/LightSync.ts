import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
//@ts-ignore
import vertexShader from '../shaders/LightSync.vert'
//@ts-ignore
import fragmentShader from '../shaders/LightSync.frag'
import { Uniform } from 'three'
import UpdateResource from '../UpdateResource'
import { Strobe } from '../util/animations'
import { getColors } from 'shared/dmxColors'
import CustomPassShader from './CustomPassShader'
import EffectBase from './EffectBase'
import { LightSyncConfig } from './effectConfigs'

type LightSyncShader = CustomPassShader<{
  tDiffuse: Uniform
  colorMultipler: Uniform // vec3 color
  brightnessMultiplier: Uniform // float brightness, master, strobe
  windowSize: Uniform // vec2
  windowPosition: Uniform // vec2
}>

export class LightSync extends EffectBase {
  config: LightSyncConfig
  shader: LightSyncShader
  pass: ShaderPass
  strobe: Strobe

  constructor(config: LightSyncConfig) {
    super()
    this.config = config
    this.shader = {
      uniforms: {
        tDiffuse: new Uniform(null),
        colorMultipler: new Uniform([0, 0, 0]),
        brightnessMultiplier: new Uniform(1.0),
        windowSize: new Uniform([1, 1]),
        windowPosition: new Uniform([0, 0]),
      },
      vertexShader,
      fragmentShader,
    }
    this.pass = new ShaderPass(this.shader)
    this.strobe = new Strobe()
  }

  update(dt: number, res: UpdateResource) {
    let brightnessMultiplier = 1.0

    if (this.config.obeyMaster) brightnessMultiplier *= res.master
    if (this.config.obeyBrightness)
      brightnessMultiplier *= res.params.brightness
    if (this.config.obeyStrobe)
      brightnessMultiplier *= this.strobe.update(dt, res.params.strobe)

    this.pass.uniforms.brightnessMultiplier.value = brightnessMultiplier

    if (this.config.obeyColor) {
      const colors = getColors(res.params)
      this.pass.uniforms.colorMultipler.value = [
        colors.red,
        colors.green,
        colors.blue,
      ]
    } else {
      this.pass.uniforms.colorMultipler.value = [1, 1, 1]
    }

    if (this.config.obeyPosition) {
      this.pass.uniforms.windowPosition.value = [
        mapGLCoords(res.params.x),
        mapGLCoords(res.params.y),
      ]
      this.pass.uniforms.windowSize.value = [
        mapGLSize(res.params.width),
        mapGLSize(res.params.height),
      ]
    } else {
      this.pass.uniforms.windowPosition.value = [0, 0]
      this.pass.uniforms.windowSize.value = [1, 1]
    }
  }
}

function mapGLCoords(normalized: number): number {
  return normalized
  // return normalized * 2 - 1
}

function mapGLSize(normalized: number): number {
  return normalized
  // return normalized * 2
}
