import React from 'react'
import { useTypedSelector } from '../../redux/store'
import { resetScenesState, SceneState_t } from '../../redux/scenesSlice'
import { IconButton } from '@material-ui/core'
import { store } from '../../redux/store'
import { loadFile, saveFile, captivateFileFilters } from '../../util/saveload_renderer'
import SaveIcon from '@material-ui/icons/Save'
import PublishIcon from '@material-ui/icons/Publish'
import AutoScene from './AutoScene'
import {Scene, NewScene} from './Scene'

function loadScenes() {
  loadFile('Load Scenes', [captivateFileFilters.scenes]).then(string => {
    console.log(string)
    const newScenes: SceneState_t = JSON.parse(string)
    store.dispatch(resetScenesState(newScenes))
  }).catch(err => {
    console.log(err)
  })
}

function saveScenes() {
  const data = JSON.stringify( store.getState().scenes )

  saveFile('Save Scenes', data, [captivateFileFilters.scenes]).then(err => {
    if (err) {
      console.log(err)
    }
  }).catch(err => {
    console.log(err)
  })
}

export default function SceneSelection() {
  const sceneIds = useTypedSelector(state => state.scenes.ids)

  return (
    <div style={{
      backgroundColor: '#0003', padding: '0.5rem', height: '100%', borderRight: '1px solid #fff3',
      display: 'flex', flexDirection: 'column'
    }}>
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
      <div style={{ flex: '0 1 auto', overflow: 'scroll' }}>
        {sceneIds.map((id, index) => {
          return (
            <Scene key={index} index={index} id={id} />
          )
        })}
        <NewScene />
      </div>
    </div>
  )
}
