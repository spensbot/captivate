import {
  LightScenes_t,
  resetLightScenes,
  SceneType,
} from '../redux/controlSlice'
import { IconButton } from '@mui/material'
import { store } from '../redux/store'
import { loadFile, saveFile, captivateFileFilters } from '../saveload_renderer'
import styled from 'styled-components'
import SaveIcon from '@mui/icons-material/Save'
import PublishIcon from '@mui/icons-material/Publish'
import AutoScene from './AutoScene'
import ScenesList from './ScenesList'

function loadScenes() {
  // loadFile('Load Scenes', [captivateFileFilters.scenes])
  //   .then((serializedLightScenes) => {
  //     const newScenes: ControlState = JSON.parse(serializedLightScenes)
  //     store.dispatch(resetLightScenes(newScenes))
  //   })
  //   .catch((err) => {
  //     console.log(err)
  //   })
}

function saveScenes() {
  // const controlState: ControlState = store.getState().scenes.present
  // const serializedControlState = JSON.stringify(controlState)
  // saveFile('Save Scenes', serializedControlState, [captivateFileFilters.scenes])
  //   .then((err) => {
  //     if (err) {
  //       console.log(err)
  //     }
  //   })
  //   .catch((err) => {
  //     console.log(err)
  //   })
}

function loadVisualizerScenes() {}

function saveVisualizerScenes() {}

export default function SceneSelection({
  sceneType,
}: {
  sceneType: SceneType
}) {
  return (
    <Root>
      <Header>
        {`${sceneType === 'light' ? 'Light' : 'Visual'} Scenes`}
        <Sp />
        <IconButton
          onClick={sceneType === 'light' ? saveScenes : saveVisualizerScenes}
        >
          <SaveIcon />
        </IconButton>
        <IconButton
          onClick={sceneType === 'light' ? loadScenes : loadVisualizerScenes}
        >
          <PublishIcon />
        </IconButton>
      </Header>
      <Sp2 />
      <AutoScene sceneType={sceneType} />
      <Sp2 />
      <ScenesList sceneType={sceneType} />
    </Root>
  )
}

const Root = styled.div`
  background-color: ${(props) => props.theme.colors.bg.darker};
  padding: 1rem;
  height: 100%;
  border-right: 1px solid ${(props) => props.theme.colors.divider};
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  margin-top: -0.3rem;
  font-size: ${(props) => props.theme.font.size.h1};
`

const Sp = styled.div`
  flex: 1 0 0;
`

const Sp2 = styled.div`
  height: 0.5rem;
`
