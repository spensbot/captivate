import { render } from 'react-dom'
import { ThemeProvider } from 'styled-components'
import GlobalStyle from './GlobalStyle'
import App from './App'
import * as themes from './theme'
import { Provider } from 'react-redux'
import { store, getCleanReduxState, resetState } from './redux/store'
import {
  setDmx,
  setMidi,
  setSaving,
  setLoading,
  setNewProjectDialog,
  setActivePage,
} from './redux/guiSlice'
import { Page } from 'shared/pages'
import {
  realtimeStore,
  realtimeContext,
  initRealtimeState,
  update as updateRealtimeStore,
} from './redux/realtimeStore'
import { ipc_setup, send_control_state } from './ipcHandler'
import { ThemeProvider as MuiThemeProvider } from '@emotion/react'
import { createTheme } from '@mui/material/styles'
import { autoSave } from './autosave'
import { getUndoGroup, undoAction, redoAction } from './controls/UndoRedo'
import { load } from './menu/SaveLoad'
import { getSaveConfig } from 'shared/save'

const theme = themes.dark()
const muiTheme = createTheme({
  palette: {
    mode: 'dark',
  },
})
let _frequentlyUpdatedRealtimeState = initRealtimeState()
let _isApplyingRemoteState = false

function parsePageFromLocation(): Page | null {
  const page = new URLSearchParams(window.location.search).get('page')
  const validPages: Page[] = [
    'Universe',
    'Modulation',
    'Video',
    'Share',
    'Mixer',
    'Led',
  ]
  if (page && validPages.includes(page as Page)) {
    return page as Page
  }
  return null
}

autoSave(store)

const pageFromLocation = parsePageFromLocation()
if (pageFromLocation) {
  store.dispatch(setActivePage(pageFromLocation))
}

ipc_setup({
  on_dmx_connection_update: (payload) => {
    store.dispatch(setDmx(payload))
  },
  on_midi_connection_update: (payload) => {
    store.dispatch(setMidi(payload))
  },
  on_time_state: (newRealtimeState) => {
    _frequentlyUpdatedRealtimeState = newRealtimeState
  },
  on_dispatch: (action) => {
    store.dispatch(action)
  },
  on_main_command: (command) => {
    if (command.type === 'undo') {
      const group = getUndoGroup(store.getState())
      if (group !== null) {
        store.dispatch(undoAction(group))
      }
    } else if (command.type === 'redo') {
      const group = getUndoGroup(store.getState())
      if (group !== null) {
        store.dispatch(redoAction(group))
      }
    } else if (command.type === 'load') {
      load()
        .then((state) =>
          store.dispatch(
            setLoading({
              state,
              config: getSaveConfig(state),
            })
          )
        )
        .catch((err) => console.warn(err))
    } else if (command.type === 'save') {
      store.dispatch(setSaving(true))
    } else if (command.type === 'new-project') {
      store.dispatch(setNewProjectDialog(true))
    }
  },
  on_control_state: (newState) => {
    const localPage = store.getState().gui.activePage
    _isApplyingRemoteState = true
    store.dispatch(
      resetState({
        ...newState,
        gui: {
          ...newState.gui,
          activePage: localPage,
        },
      })
    )
    _isApplyingRemoteState = false
  },
})

function animateRealtimeState() {
  realtimeStore.dispatch(updateRealtimeStore(_frequentlyUpdatedRealtimeState))
  requestAnimationFrame(animateRealtimeState)
}

animateRealtimeState()

send_control_state(getCleanReduxState(store.getState()))

store.subscribe(() => {
  if (_isApplyingRemoteState) return
  send_control_state(getCleanReduxState(store.getState()))
})

render(
  <Provider store={store}>
    <Provider store={realtimeStore} context={realtimeContext}>
      <ThemeProvider theme={theme}>
        <MuiThemeProvider theme={muiTheme}>
          <GlobalStyle />
          <App />
        </MuiThemeProvider>
      </ThemeProvider>
    </Provider>
  </Provider>,
  document.getElementById('root')
)
