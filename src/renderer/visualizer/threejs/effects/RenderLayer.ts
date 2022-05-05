import UpdateResource from '../UpdateResource'
import LayerBase from '../layers/LayerBase'
import EffectBase from './EffectBase'
import constructLayer from '../layers/constructLayer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { RenderLayerConfig } from './effectConfigs'

export class RenderLayer extends EffectBase {
  type = 'RenderLayer'
  config: RenderLayerConfig
  active_layer: LayerBase
  pass: RenderPass

  constructor(config: RenderLayerConfig) {
    super()
    this.config = config
    this.active_layer = constructLayer(this.config.layerConfig)
    this.pass = new RenderPass(...this.active_layer.getRenderInputs())
  }

  update(_dt: number, _res: UpdateResource) {}

  resize(_width: number, _height: number) {}

  dispose() {}
}
