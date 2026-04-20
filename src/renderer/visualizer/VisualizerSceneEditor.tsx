import styled from 'styled-components'
import { useActiveVisualScene } from '../redux/store'
import { useDispatch } from 'react-redux'
import { setVisualSceneConfig } from '../redux/controlSlice'
import LayerEditor from './LayerEditor'

export default function VisualizerSceneEditor() {
  const config = useActiveVisualScene((scene) => scene.config)
  const dispatch = useDispatch()

  return (
    <Root>
      <LayerEditor
        config={config}
        onChange={(newConfig) => dispatch(setVisualSceneConfig(newConfig))}
      />
    </Root>
  )
}

const Root = styled.div`
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 0.8rem;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  scrollbar-gutter: stable both-edges;
  scrollbar-width: thin;
  scrollbar-color: #7a7a7a99 #0000;

  &::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  &::-webkit-scrollbar-track {
    background: #0000;
  }

  &::-webkit-scrollbar-thumb {
    background: #7a7a7a99;
    border-radius: 999px;
  }
`
