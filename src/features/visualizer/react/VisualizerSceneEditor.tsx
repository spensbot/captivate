import styled from 'styled-components'
import { useActiveVisualScene } from '../../../renderer/redux/store'
import Select from 'features/ui/react/base/Select'
import {
  visualizerTypeList,
  initLayerConfig,
  layerDisplayNames,
  layerTypeFromDisplayName,
} from '../threejs/layers/LayerConfig'
import { useDispatch } from 'react-redux'
import { setVisualSceneConfig } from '../../../renderer/redux/controlSlice'
import LayerEditor from './LayerEditor'

interface Props {}

export default function VisualizerSceneEditor({}: Props) {
  const config = useActiveVisualScene((scene) => scene.config)
  const dispatch = useDispatch()

  return (
    <Root>
      <Select
        label="Type"
        val={layerDisplayNames[config.type]}
        items={visualizerTypeList.map((type) => layerDisplayNames[type])}
        onChange={(displayName) =>
          dispatch(
            setVisualSceneConfig(
              initLayerConfig(layerTypeFromDisplayName(displayName))
            )
          )
        }
        style={{ fontSize: '1.4rem' }}
      />
      <LayerEditor
        config={config}
        onChange={(newConfig) => dispatch(setVisualSceneConfig(newConfig))}
      />
    </Root>
  )
}

const Root = styled.div`
  padding: 1rem;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  & > * {
    margin-bottom: 0.5rem;
  }
  border-right: 1px solid #777;
`
