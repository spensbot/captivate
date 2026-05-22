import { createRoot } from 'react-dom/client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ThemeProvider } from 'styled-components'
import GlobalStyle from '../renderer/GlobalStyle'
import * as themes from '../renderer/theme'
import { Provider } from 'react-redux'
import {
  store,
  resetRemoteState,
  resetState,
  type CleanReduxState,
} from '../renderer/redux/store'
import initState from '../renderer/redux/initState'
import { setDmx, setMidi } from '../renderer/redux/guiSlice'
import {
  realtimeStore,
  realtimeContext,
  update as updateRealtimeStore,
} from '../renderer/redux/realtimeStore'
import { ThemeProvider as MuiThemeProvider } from '@emotion/react'
import { createTheme } from '@mui/material/styles'
import {
  clearHostTransport,
  registerHostTransport,
} from '../shared/hostTransport'
import { bindRemoteSync } from './remoteIpc'
import { buildRemoteWebSocketUrl, RemoteSync } from './remoteSync'
import { RemoteAppShell } from './RemoteAppShell'
import RemoteErrorBoundary from './RemoteErrorBoundary'
import { RemoteUiModeProvider } from './RemoteUiModeContext'
import RemoteMobileGlobalStyle from './RemoteMobileGlobalStyle'
import { isRemoteDispatchAllowed } from '../shared/remoteControl'
import type { PayloadAction } from '@reduxjs/toolkit'

const theme = themes.dark()
const muiTheme = createTheme({ palette: { mode: 'dark' } })

let _isApplyingRemoteState = false
let _isApplyingRemoteDispatch = false

function RemoteRoot() {
  const [authenticated, setAuthenticated] = useState(false)
  const [authError, setAuthError] = useState('')

  const sync = useMemo(
    () =>
      new RemoteSync({
        onAuthOk: () => {
          setAuthenticated(true)
          setAuthError('')
        },
        onAuthFail: (message) => {
          setAuthenticated(false)
          setAuthError(message)
        },
        onControlState: (state: CleanReduxState) => {
          _isApplyingRemoteState = true
          try {
            store.dispatch(resetRemoteState(state))
          } finally {
            _isApplyingRemoteState = false
          }
        },
        onTimeState: (state) => {
          realtimeStore.dispatch(updateRealtimeStore(state))
        },
        onDmxConnection: (payload) => {
          store.dispatch(setDmx(payload))
        },
        onMidiConnection: (payload) => {
          store.dispatch(setMidi(payload))
        },
        onDispatch: (action) => {
          _isApplyingRemoteDispatch = true
          try {
            store.dispatch(action as PayloadAction<unknown>)
          } finally {
            _isApplyingRemoteDispatch = false
          }
        },
        onStatus: () => undefined,
      }),
    []
  )

  useEffect(() => {
    bindRemoteSync(sync)
    registerHostTransport({
      sendDispatch: (action) => sync.sendDispatch(action),
      sendUserCommand: (command) => sync.sendUserCommand(command),
    })
    return () => {
      sync.disconnect()
      clearHostTransport()
    }
  }, [sync])

  const rawDispatch = store.dispatch.bind(store)
  ;(store as { dispatch: typeof store.dispatch }).dispatch = ((
    action: unknown
  ) => {
    const result = rawDispatch(action as PayloadAction<unknown>)
    if (
      !_isApplyingRemoteDispatch &&
      !_isApplyingRemoteState &&
      isRemoteDispatchAllowed(action)
    ) {
      sync.sendDispatch(action as PayloadAction<unknown>)
    }
    return result
  }) as typeof store.dispatch

  const handleConnect = useCallback(
    (url: string, pin: string) => {
      setAuthError('')
      setAuthenticated(false)
      try {
        const wsUrl = buildRemoteWebSocketUrl(url)
        sync.connect(wsUrl, pin)
      } catch (e) {
        setAuthError(e instanceof Error ? e.message : String(e))
      }
    },
    [sync]
  )

  return (
    <RemoteAppShell
      authenticated={authenticated}
      authError={authError}
      onRequestConnect={handleConnect}
    />
  )
}

const appRoot = document.getElementById('root')
if (appRoot === null) {
  throw new Error('Remote root element (#root) was not found.')
}

// Seed Redux before first paint (remote has no main-process bootstrap snapshot yet).
store.dispatch(resetState(initState()))

createRoot(appRoot).render(
  <RemoteErrorBoundary>
    <Provider store={store}>
      <Provider store={realtimeStore} context={realtimeContext}>
        <ThemeProvider theme={theme}>
          <MuiThemeProvider theme={muiTheme}>
            <RemoteUiModeProvider>
              <GlobalStyle />
              <RemoteMobileGlobalStyle />
              <RemoteRoot />
            </RemoteUiModeProvider>
          </MuiThemeProvider>
        </ThemeProvider>
      </Provider>
    </Provider>
  </RemoteErrorBoundary>
)
