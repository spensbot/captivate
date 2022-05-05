import UpdateResource from '../UpdateResource'
import LayerBase from '../layers/LayerBase'
import EffectBase from './EffectBase'
import constructLayer from '../layers/constructLayer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { RenderLayerConfig } from './effectConfigs'
import { LayerConfig } from '../layers/LayerConfig'

export function constructRenderLayer(layerConfig: LayerConfig): RenderLayer {
  return new RenderLayer({
    type: 'RenderLayer',
    layerConfig,
  })
}

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

  update(dt: number, res: UpdateResource) {
    this.active_layer.update(dt, res)
  }

  resize(width: number, height: number) {
    this.active_layer.resize(width, height)
  }

  dispose() {
    this.active_layer.dispose()
  }
}
