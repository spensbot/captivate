import { ReduxStore } from '../redux/store'
import { setActiveSceneIndex } from '../redux/scenesSlice'

let _store: ReduxStore

function onKeyDown(this: Document, e: KeyboardEvent) {
  if (parseInt(e.key) !== NaN) {
    _store.dispatch(setActiveSceneIndex(parseInt(e.key) - 1)) 
  }
}

export function init(store: ReduxStore) {
  _store = store
  
  document.addEventListener('keydown', onKeyDown);
}