import styled from 'styled-components'
import { useActiveVisualScene } from '../redux/store'
import Select from '../base/Select'
import {
  visualizerTypeList,
  initVisualizerConfig,
} from './threejs/VisualizerConfig'
import { useDispatch } from 'react-redux'
import { setVisualSceneConfig } from '../redux/controlSlice'

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
          dispatch(setVisualSceneConfig(initVisualizerConfig(newType)))
        }
      />
    </Root>
  )
}

const Root = styled.div`
  margin: 1rem;
`
