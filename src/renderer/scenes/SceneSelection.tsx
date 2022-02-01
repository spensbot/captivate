import {
  SceneType,
  ControlState,
  sortScenesByBombacity,
  autoBombacity,
} from '../redux/controlSlice'
import { IconButton } from '@mui/material'
import { store, resetControl } from '../redux/store'
import { loadFile, saveFile, captivateFileFilters } from '../saveload_renderer'
import styled from 'styled-components'
import SaveIcon from '@mui/icons-material/Save'
import FileOpenIcon from '@mui/icons-material/FileOpen'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import SortIcon from '@mui/icons-material/Sort'
import AutoScene from './AutoScene'
import ScenesList from './ScenesList'
import { useDispatch } from 'react-redux'

type SaveType = ControlState

function loadScenes() {
  loadFile('Load Scenes', [captivateFileFilters.scenes])
    .then((serializedControlState) => {
      const newControlState: SaveType = JSON.parse(serializedControlState)
      store.dispatch(resetControl(newControlState))
    })
    .catch((err) => {
      console.log(err)
    })
}

function saveScenes() {
  const controlState: SaveType = store.getState().control.present
  const serializedControlState = JSON.stringify(controlState)
  saveFile('Save Scenes', serializedControlState, [captivateFileFilters.scenes])
    .then((err) => {
      if (err) {
        console.log(err)
      }
    })
    .catch((err) => {
      console.log(err)
    })
}

export default function SceneSelection({
  sceneType,
}: {
  sceneType: SceneType
}) {
  const dispatch = useDispatch()

  return (
    <Root>
      <Header>
        {`${sceneType === 'light' ? 'Light' : 'Visual'} Scenes`}
        <Sp />
        {sceneType === 'light' && (
          <>
            {' '}
            <IconButton
              onClick={() => dispatch(sortScenesByBombacity(sceneType))}
            >
              <SortIcon style={{ transform: 'scaleY(-1)' }} />
            </IconButton>
            <IconButton onClick={() => dispatch(autoBombacity(sceneType))}>
              <AutoAwesomeIcon />
            </IconButton>
          </>
        )}
        <IconButton onClick={saveScenes}>
          <SaveIcon />
        </IconButton>
        <IconButton onClick={loadScenes}>
          <FileOpenIcon />
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
  min-height: 0.5rem;
`
