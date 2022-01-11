import React from 'react'
import { resetScenesState, SceneState } from '../redux/scenesSlice'
import { IconButton } from '@mui/material'
import { store } from '../redux/store'
import {
  loadFile,
  saveFile,
  captivateFileFilters,
} from '../../util/saveload_renderer'
import SaveIcon from '@mui/icons-material/Save'
import PublishIcon from '@mui/icons-material/Publish'
import AutoScene from './AutoScene'
import ScenesList from './ScenesList'

function loadScenes() {
  // loadFile('Load Scenes', [captivateFileFilters.scenes])
  //   .then((string) => {
  //     console.log(string)
  //     const newScenes: SceneState = JSON.parse(string)
  //     store.dispatch(resetScenesState(newScenes))
  //   })
  //   .catch((err) => {
  //     console.log(err)
  //   })
}

function saveScenes() {
  // const data = JSON.stringify(store.getState().scenes)
  // saveFile('Save Scenes', data, [captivateFileFilters.scenes])
  //   .then((err) => {
  //     if (err) {
  //       console.log(err)
  //     }
  //   })
  //   .catch((err) => {
  //     console.log(err)
  //   })
}

export default function SceneSelection() {
  return (
    <div
      style={{
        backgroundColor: '#0003',
        padding: '0.5rem',
        height: '100%',
        borderRight: '1px solid #fff3',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ fontSize: '1.5rem' }}>Scenes</div>
        <div style={{ flex: '1 0 0' }} />
        <IconButton onClick={saveScenes}>
          <SaveIcon />
        </IconButton>
        <IconButton onClick={loadScenes}>
          <PublishIcon />
        </IconButton>
      </div>
      <AutoScene />
      <ScenesList />
    </div>
  )
}
