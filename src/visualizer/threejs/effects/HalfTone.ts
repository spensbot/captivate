import { HalftonePass } from 'three/examples/jsm/postprocessing/HalftonePass'
import EffectBase from './EffectBase'
import { HalfToneConfig } from './effectConfigs'

export class HalfTone extends EffectBase {
  type = 'HalfTone'
  config: HalfToneConfig
  pass: HalftonePass

  constructor(config: HalfToneConfig) {
    super()
    this.config = config
    this.pass = new HalftonePass({
      radius: config.radius,
      scatter: config.scatter,
      shape: config.shape,
    })
  }

  resize(width: number, height: number): void {
    this.pass.setSize(width, height)
  }
}
