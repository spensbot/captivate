import React from 'react'
import { useTypedSelector } from '../redux/store'
import { makeStyles } from '@material-ui/core/styles'
import { useDispatch } from 'react-redux'
import { setActiveScene, addScene, removeScene, resetScenesState, SceneState_t } from '../redux/scenesSlice'
import { nanoid } from 'nanoid'
import { initScene } from '../engine/scene_t'
import { IconButton } from '@material-ui/core'
import CloseIcon from '@material-ui/icons/Close'
import AddIcon from '@material-ui/icons/Add';
import { store } from '../redux/store'
import { loadFile, saveFile } from '../util/saveload_renderer'
import SaveIcon from '@material-ui/icons/Save';
import GetAppIcon from '@material-ui/icons/GetApp';

function loadScenes() {
  loadFile('Load Scenes', null).then(string => {
    console.log(string)
    const newScenes: SceneState_t = JSON.parse(string)
    store.dispatch(resetScenesState(newScenes))
  }).catch(err => {
    console.log(err)
  })
}

function saveScenes() {
  const data = JSON.stringify( store.getState().scenes )

  saveFile('Save Scenes', data, null).then(err => {
    if (err) {
      console.log(err)
    }
  }).catch(err => {
    console.log(err)
  })
}

  
const height = 3

const useStyles = makeStyles({
  root: {
    height: `${height}rem`,
    padding: '0.5rem',
    marginRight: '0.3rem',
    marginBottom: '0.3rem',
    color: "#fff8",
    backgroundColor: '#fff2',
    cursor: 'pointer'
  },
  selected: {
    padding: '0.4rem',
    border: '0.1rem solid #fffa',
    color: '#fffc'
  }
})

function Scene({ index, id }: { index: number, id: string }) {
  const classes = useStyles()
  const isSelected = useTypedSelector(state => state.scenes.active === id)
  const dispatch = useDispatch()
  return (
    <div className={`${classes.root} ${isSelected ? classes.selected : null}`} onClick={() => { dispatch(setActiveScene(id))} }>
      Scene {index + 1}
      { isSelected ? null : (
        <IconButton aria-label="delete" size="small" onClick={e => {
          e.stopPropagation()
          dispatch(removeScene({ index: index }))
        }}>
          <CloseIcon />
        </IconButton>
      )}
    </div>
  )
}

function NewScene() {
  const classes = useStyles()
  const dispatch = useDispatch()
  return (
    <div className={classes.root} onClick={() => dispatch(addScene({ id: nanoid(), scene: initScene() }))}>
      <AddIcon />
    </div>
  )
}

let array = Array.from(Array(5).keys())

export default function SceneSelection() {
  const sceneIds = useTypedSelector(state => state.scenes.ids)

  return (
    <div style={{ backgroundColor: '#0006', padding: '0.5rem', height: '100%', maxHeight: '100%'}}>
      <div style={{ display: 'flex' }}>
        <div style={{ fontSize: '1.5rem' }}>Scenes</div>
        <div style={{ flex: '1 0 0' }} />
        <IconButton onClick={loadScenes}>
          <SaveIcon />
        </IconButton>
        <IconButton onClick={saveScenes}>
          <GetAppIcon />
        </IconButton>
      </div>
      <div style={{ overflow: 'scroll' }}>
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
