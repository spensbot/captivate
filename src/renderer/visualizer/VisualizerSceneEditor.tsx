import styled from 'styled-components'
import { useActiveVisualScene } from '../redux/store'
import Select from '../base/Select'
import {
  visualizerTypeList,
  initLayerConfig,
} from './threejs/layers/LayerConfig'
import { useDispatch } from 'react-redux'
import { setVisualSceneConfig } from '../redux/controlSlice'
import LayerEditor from './LayerEditor'

interface Props {}

export default function VisualizerSceneEditor({}: Props) {
  const config = useActiveVisualScene((scene) => scene.config)
  const dispatch = useDispatch()

  return (
    <Root>
      <Select
        label="Type"
        val={config.type}
        items={visualizerTypeList}
        onChange={(newType) =>
          dispatch(setVisualSceneConfig(initLayerConfig(newType)))
        }
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
  & > * {
    margin-bottom: 0.5rem;
  }
`
