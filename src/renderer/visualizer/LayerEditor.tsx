import { LayerConfig } from '../../visualizer/threejs/layers/LayerConfig'
import BuiltinVisualizerEditor from './BuiltinVisualizerEditor'

interface Props {
  config: LayerConfig
  onChange: (newConfig: LayerConfig) => void
}

export default function LayerEditor({ config, onChange }: Props) {
  return (
    <BuiltinVisualizerEditor
      config={config.builtin}
      onChange={(newBuiltinConfig) =>
        onChange({
          ...config,
          builtin: newBuiltinConfig,
        })
      }
    />
  )
}
