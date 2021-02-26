import { ReduxStore } from '../redux/store'

let _store: ReduxStore

function onKeyDown(e: React.KeyboardEvent) {
  console.log(e.key)
  console.log(parseInt(e.key))
  if (parseInt(e.key)) {
    _store.dispatch() parseInt(e.key)
  }
}

export function init(store: ReduxStore) {
  _store = store
  
  document.addEventListener('keydown', () => {});
}