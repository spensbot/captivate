import UpdateResource from '../UpdateResource'
import LayerBase from '../layers/LayerBase'
import EffectBase from './EffectBase'
import constructLayer from '../layers/constructLayer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { RenderLayerConfig } from './effectConfigs'
import { LayerConfig } from '../layers/LayerConfig'

export function constructRenderLayer(
  layerConfig: LayerConfig,
  clear: boolean
): RenderLayer {
  return new RenderLayer(
    {
      type: 'RenderLayer',
      layerConfig,
    },
    clear
  )
}

export class RenderLayer extends EffectBase {
  type = 'RenderLayer'
  config: RenderLayerConfig
  active_layer: LayerBase
  pass: RenderPass

  constructor(config: RenderLayerConfig, _clear: boolean) {
    super()
    this.config = config
    this.active_layer = constructLayer(this.config.layerConfig)
    this.pass = new RenderPass(...this.active_layer.getRenderInputs())
  }

  update(res: UpdateResource) {
    this.active_layer.update(res)
  }

  resize(width: number, height: number) {
    this.active_layer.resize(width, height)
    this.pass = new RenderPass(...this.active_layer.getRenderInputs())
  }

  dispose() {
    this.active_layer.dispose()
  }
}
