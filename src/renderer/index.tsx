import { render } from 'react-dom'
import { ThemeProvider } from 'styled-components'
import GlobalStyle from './GlobalStyle'
import App from './App'
import * as themes from './theme'
import { Provider } from 'react-redux'
import { store } from './redux/store'
import { setDmx, setMidi } from './redux/connectionsSlice'
import {
  realtimeStore,
  realtimeContext,
  update as updateRealtimeStore,
} from './redux/realtimeStore'
import { ipc_setup } from './ipcHandler'
import { ThemeProvider as MuiThemeProvider } from '@emotion/react'
import { createTheme } from '@mui/material/styles'
import { autoSave } from './saveload_renderer'

const theme = themes.dark()
const muiTheme = createTheme({
  palette: {
    mode: 'dark',
  },
})

autoSave(store)

const ipc_callbacks = ipc_setup({
  on_dmx_connection_update: (payload) => {
    store.dispatch(
      setDmx({ isConnected: !!payload, path: payload || undefined })
    )
  },
  on_midi_connection_update: (payload) => {
    store.dispatch(
      setMidi({ isConnected: payload.length > 0, path: payload[0] })
    )
  },
  on_time_state: (realtimeState) => {
    realtimeStore.dispatch(updateRealtimeStore(realtimeState))
  },
  on_dispatch: (action) => {
    store.dispatch(action)
  },
})

ipc_callbacks.send_control_state(store.getState())

store.subscribe(() => ipc_callbacks.send_control_state(store.getState()))

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
