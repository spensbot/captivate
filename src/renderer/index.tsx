import { render } from 'react-dom'
import { ThemeProvider } from 'styled-components'
import GlobalStyle from './GlobalStyle'
import App from './App'
import * as themes from './theme'
import { Provider } from 'react-redux'
import { store, getCleanReduxState } from './redux/store'
import { setDmx, setMidi } from './redux/guiSlice'
import { setActiveSceneIndex } from './redux/controlSlice'
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

const theme = themes.dark()
const muiTheme = createTheme({
  palette: {
    mode: 'dark',
  },
})
let _frequentlyUpdatedRealtimeState = initRealtimeState()

autoSave(store)

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
})

function animateRealtimeState() {
  realtimeStore.dispatch(updateRealtimeStore(_frequentlyUpdatedRealtimeState))
  requestAnimationFrame(animateRealtimeState)
}

animateRealtimeState()

send_control_state(getCleanReduxState(store.getState()))

store.subscribe(() => send_control_state(getCleanReduxState(store.getState())))

// document.onkeydown = (e) => {
//   const asInt = parseInt(e.key)
//   if (asInt !== NaN) {
//     if (asInt === 0) {
//       store.dispatch(
//         setActiveSceneIndex({
//           sceneType: 'light',
//           val: 10,
//         })
//       )
//     } else {
//       store.dispatch(
//         setActiveSceneIndex({
//           sceneType: 'light',
//           val: asInt - 1,
//         })
//       )
//     }
//   }
//   if (e.metaKey && e.key === 'z') {
//     const group = getUndoGroup(store.getState())
//     if (group !== null) {
//       if (e.shiftKey) {
//         store.dispatch(redoAction(group))
//       } else {
//         store.dispatch(undoAction(group))
//       }
//     }
//   }
// }

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
