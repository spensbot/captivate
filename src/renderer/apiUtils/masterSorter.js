import { store } from 'renderer/redux/store'
import { redoAction, undoAction } from 'renderer/controls/UndoRedo'
import {
  setActivePage,
  setBlackout,
  setConnectionsMenu,
  setLEDFx,
  setNewProjectDialog,
  setSaving,
  setSceneSelect,
} from 'renderer/redux/guiSlice'
import { getUndoGroup } from 'renderer/controls/UndoRedo'
import { setMaster } from 'renderer/redux/controlSlice'

export const masterSorter = (target, data) => {
  switch (target) {
    case 'master': {
      store.dispatch(setMaster(data.value))
      break
    }
    case 'undoAction': {
      let group = getGroup()
      store.dispatch(undoAction(group))
      break
    }
    case 'redoAction': {
      let group = getGroup()
      store.dispatch(redoAction(group))
      break
    }
    case 'connectionMenu': {
      store.dispatch(setConnectionsMenu(data.value))
      break
    }
    case 'saving': {
      store.dispatch(setSaving(data.value))
      break
    }
    case 'newProjectDialog': {
      store.dispatch(setNewProjectDialog(data.value))
      break
    }
    case 'activePage': {
      store.dispatch(setActivePage(data.value))
      break
    }
    case 'blackout': {
      store.dispatch(setBlackout(data.value))
      break
    }
    case 'sceneSelect': {
      store.dispatch(setSceneSelect(data.value))
      break
    }
    case 'ledfx': {
      store.dispatch(setLEDFx(data.value))
    }
    default: {
      throw Error('Invalid property.')
    }
  }
}
const getGroup = () => {
  let state = store.getState()
  selector = getUndoGroup(state)

  return selector
}
