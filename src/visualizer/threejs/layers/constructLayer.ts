import { LayerConfig } from './LayerConfig'
import LayerBase from './LayerBase'
import BuiltinVisualizer from './BuiltinVisualizer'

export default function constructLayer(config: LayerConfig): LayerBase {
  return new BuiltinVisualizer(config.builtin)
}
