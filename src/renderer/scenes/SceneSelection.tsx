import { resetScenesState, SceneState } from '../redux/scenesSlice'
import { IconButton } from '@mui/material'
import { store } from '../redux/store'
import { loadFile, saveFile, captivateFileFilters } from '../saveload_renderer'
import styled from 'styled-components'
import SaveIcon from '@mui/icons-material/Save'
import PublishIcon from '@mui/icons-material/Publish'
import AutoScene from './AutoScene'
import ScenesList from './ScenesList'

function loadScenes() {
  loadFile('Load Scenes', [captivateFileFilters.scenes])
    .then((string) => {
      console.log(string)
      const newScenes: SceneState = JSON.parse(string)
      store.dispatch(resetScenesState(newScenes))
    })
    .catch((err) => {
      console.log(err)
    })
}

function saveScenes() {
  const data = JSON.stringify(store.getState().scenes)
  saveFile('Save Scenes', data, [captivateFileFilters.scenes])
    .then((err) => {
      if (err) {
        console.log(err)
      }
    })
    .catch((err) => {
      console.log(err)
    })
}

export default function SceneSelection() {
  return (
    <Root>
      <Header>
        Scenes
        <Sp />
        <IconButton onClick={saveScenes}>
          <SaveIcon />
        </IconButton>
        <IconButton onClick={loadScenes}>
          <PublishIcon />
        </IconButton>
      </Header>
      <Sp2 />
      <AutoScene />
      <Sp2 />
      <ScenesList />
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
